import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// vi.mock factories are hoisted above top-level const declarations, so the mock
// fns must be created via vi.hoisted to avoid a TDZ ("Cannot access ... before
// initialization") error.
const { txRateLimitWindowFindUnique, txRateLimitWindowUpsert, txRateLimitWindowUpdateMany } =
  vi.hoisted(() => ({
    txRateLimitWindowFindUnique: vi.fn() as Mock,
    txRateLimitWindowUpsert: vi.fn() as Mock,
    txRateLimitWindowUpdateMany: vi.fn() as Mock,
  }));

const { mockRateLimitWindowDeleteMany } = vi.hoisted(() => ({
  mockRateLimitWindowDeleteMany: vi.fn() as Mock,
}));

const tx = {
  rateLimitWindow: {
    findUnique: txRateLimitWindowFindUnique,
    upsert: txRateLimitWindowUpsert,
    updateMany: txRateLimitWindowUpdateMany,
  },
};

vi.mock("@/server/db", () => ({
  db: {
    rateLimitWindow: {
      findUnique: txRateLimitWindowFindUnique,
      upsert: txRateLimitWindowUpsert,
      updateMany: txRateLimitWindowUpdateMany,
      deleteMany: mockRateLimitWindowDeleteMany,
    },
    $transaction: (fn: (tx: Record<string, unknown>) => unknown) => fn(tx),
  },
  // checkAndIncrement runs its interactive $transaction on txDb (Task 9).
  txDb: {
    $transaction: (fn: (tx: Record<string, unknown>) => unknown) => fn(tx),
  },
}));

import { checkAndIncrement, pruneRateLimits } from "./ratelimit";

describe("checkAndIncrement", () => {
  beforeEach(() => {
    txRateLimitWindowFindUnique.mockReset();
    txRateLimitWindowUpsert.mockReset();
    txRateLimitWindowUpdateMany.mockReset();
    mockRateLimitWindowDeleteMany.mockReset();
  });

  it("allows within the limit via atomic conditional increment", async () => {
    txRateLimitWindowUpsert.mockResolvedValue(undefined);
    txRateLimitWindowUpdateMany.mockResolvedValue({ count: 1 });
    const r: { ok: boolean; retryAfterSeconds: number } =
      await checkAndIncrement("chat:u1", 10, 1);
    expect(r).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(txRateLimitWindowUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: expect.stringContaining("chat:u1:") as string },
        // Asymmetric matchers are typed as `any` by vitest; suppress unsafe-assignment for the mock assertion.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        create: expect.objectContaining({
          key: expect.stringContaining("chat:u1:") as string,
          windowStart: expect.any(BigInt) as bigint,
          count: 0,
        }),
        update: {},
      }) as Record<string, unknown>,
    );
    expect(txRateLimitWindowUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          key: expect.stringContaining("chat:u1:") as string,
          count: { lt: 10 },
        },
        data: { count: { increment: 1 } },
      }) as Record<string, unknown>,
    );
  });

  it("blocks over the limit when conditional update matches 0 (atomic)", async () => {
    txRateLimitWindowUpsert.mockResolvedValue(undefined);
    txRateLimitWindowUpdateMany.mockResolvedValue({ count: 0 });
    const r: { ok: boolean; retryAfterSeconds: number } =
      await checkAndIncrement("chat:u1", 10, 1);
    expect(r.ok).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThan(0);
    expect(txRateLimitWindowUpsert).toHaveBeenCalledTimes(1);
    expect(txRateLimitWindowUpdateMany).toHaveBeenCalledTimes(1);
  });

  it("creates a new row on the first call in a window (ensure upsert then conditional increment)", async () => {
    txRateLimitWindowUpsert.mockResolvedValue(undefined);
    txRateLimitWindowUpdateMany.mockResolvedValue({ count: 1 });
    const r: { ok: boolean; retryAfterSeconds: number } =
      await checkAndIncrement("chat:u1", 10, 1);
    expect(r).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(txRateLimitWindowUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: expect.stringContaining("chat:u1:") as string },
        // Asymmetric matchers typed as `any` - see above.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        create: expect.objectContaining({
          key: expect.stringContaining("chat:u1:") as string,
          count: 0,
        }),
        update: {},
      }) as Record<string, unknown>,
    );
  });

  it("allows exactly one below the limit (boundary) via conditional increment", async () => {
    txRateLimitWindowUpsert.mockResolvedValue(undefined);
    txRateLimitWindowUpdateMany.mockResolvedValue({ count: 1 });
    const r: { ok: boolean; retryAfterSeconds: number } =
      await checkAndIncrement("chat:u1", 10, 1);
    expect(r).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(txRateLimitWindowUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ count: { lt: 10 } }) as Record<
          string,
          unknown
        >,
      }) as Record<string, unknown>,
    );
  });

  it("does not allow a limit+1 burst when concurrent callers race (one conditional update wins)", async () => {
    txRateLimitWindowUpsert.mockResolvedValue(undefined);
    // First caller wins (count 1), second caller's conditional update matches 0
    txRateLimitWindowUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const r1: { ok: boolean; retryAfterSeconds: number } =
      await checkAndIncrement("chat:u1", 10, 1);
    const r2: { ok: boolean; retryAfterSeconds: number } =
      await checkAndIncrement("chat:u1", 10, 1);
    expect(r1).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(r2.ok).toBe(false);
    expect(txRateLimitWindowUpsert).toHaveBeenCalledTimes(2);
    expect(txRateLimitWindowUpdateMany).toHaveBeenCalledTimes(2);
  });

  it("increments the count atomically across calls in the same window (conditional updateMany)", async () => {
    txRateLimitWindowUpsert.mockResolvedValue(undefined);
    txRateLimitWindowUpdateMany.mockResolvedValue({ count: 1 });
    const r1: { ok: boolean; retryAfterSeconds: number } =
      await checkAndIncrement("chat:u1", 10, 1);
    const r2: { ok: boolean; retryAfterSeconds: number } =
      await checkAndIncrement("chat:u1", 10, 1);
    expect(r1).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(r2).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(txRateLimitWindowUpdateMany).toHaveBeenCalledTimes(2);
    expect(txRateLimitWindowUpsert).toHaveBeenCalledTimes(2);
  });
});

describe("pruneRateLimits", () => {
  it("deletes windows older than the retention cutoff and returns the count", async () => {
    mockRateLimitWindowDeleteMany.mockResolvedValue({ count: 7 });
    const r = await pruneRateLimits();
    expect(r).toEqual({ deleted: 7 });
    expect(mockRateLimitWindowDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { windowStart: { lt: expect.any(BigInt) as bigint } },
      }) as Record<string, unknown>,
    );
    // Cutoff is in the past (retention keeps ~24h of windows).
    const cutoff = (
      mockRateLimitWindowDeleteMany.mock.calls[0]?.[0] as {
        where: { windowStart: { lt: bigint } };
      }
    ).where.windowStart.lt;
    expect(cutoff < BigInt(Date.now())).toBe(true);
  });
});
