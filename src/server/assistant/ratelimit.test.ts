import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// vi.mock factories are hoisted above top-level const declarations, so the mock
// fns must be created via vi.hoisted to avoid a TDZ ("Cannot access ... before
// initialization") error.
const { txRateLimitFindUnique, txRateLimitUpsert, txRateLimitUpdateMany } = vi.hoisted(() => ({
  txRateLimitFindUnique: vi.fn() as Mock,
  txRateLimitUpsert: vi.fn() as Mock,
  txRateLimitUpdateMany: vi.fn() as Mock,
}));

const tx = {
  rateLimit: { findUnique: txRateLimitFindUnique, upsert: txRateLimitUpsert, updateMany: txRateLimitUpdateMany },
};

vi.mock("@/server/db", () => ({
  db: {
    rateLimit: { findUnique: txRateLimitFindUnique, upsert: txRateLimitUpsert, updateMany: txRateLimitUpdateMany },
    $transaction: (fn: (tx: Record<string, unknown>) => unknown) => fn(tx),
  },
}));

import { checkAndIncrement } from "./ratelimit";

describe("checkAndIncrement", () => {
  beforeEach(() => { txRateLimitFindUnique.mockReset(); txRateLimitUpsert.mockReset(); txRateLimitUpdateMany.mockReset(); });

  it("allows within the limit via atomic conditional increment", async () => {
    txRateLimitUpsert.mockResolvedValue(undefined);
    txRateLimitUpdateMany.mockResolvedValue({ count: 1 });
    const r: { ok: boolean; retryAfterSeconds: number } = await checkAndIncrement("chat:u1", 10, 1);
    expect(r).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(txRateLimitUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: expect.stringContaining("chat:u1:") as string },
        // Asymmetric matchers are typed as `any` by vitest; suppress unsafe-assignment for the mock assertion.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        create: expect.objectContaining({ key: expect.stringContaining("chat:u1:") as string, windowStart: expect.any(BigInt) as bigint, count: 0 }),
        update: {},
      }) as Record<string, unknown>,
    );
    expect(txRateLimitUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: expect.stringContaining("chat:u1:") as string, count: { lt: 10 } },
        data: { count: { increment: 1 } },
      }) as Record<string, unknown>,
    );
  });

  it("blocks over the limit when conditional update matches 0 (atomic)", async () => {
    txRateLimitUpsert.mockResolvedValue(undefined);
    txRateLimitUpdateMany.mockResolvedValue({ count: 0 });
    const r: { ok: boolean; retryAfterSeconds: number } = await checkAndIncrement("chat:u1", 10, 1);
    expect(r.ok).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThan(0);
    expect(txRateLimitUpsert).toHaveBeenCalledTimes(1);
    expect(txRateLimitUpdateMany).toHaveBeenCalledTimes(1);
  });

  it("creates a new row on the first call in a window (ensure upsert then conditional increment)", async () => {
    txRateLimitUpsert.mockResolvedValue(undefined);
    txRateLimitUpdateMany.mockResolvedValue({ count: 1 });
    const r: { ok: boolean; retryAfterSeconds: number } = await checkAndIncrement("chat:u1", 10, 1);
    expect(r).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(txRateLimitUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: expect.stringContaining("chat:u1:") as string },
        // Asymmetric matchers typed as `any` - see above.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        create: expect.objectContaining({ key: expect.stringContaining("chat:u1:") as string, count: 0 }),
        update: {},
      }) as Record<string, unknown>,
    );
  });

  it("allows exactly one below the limit (boundary) via conditional increment", async () => {
    txRateLimitUpsert.mockResolvedValue(undefined);
    txRateLimitUpdateMany.mockResolvedValue({ count: 1 });
    const r: { ok: boolean; retryAfterSeconds: number } = await checkAndIncrement("chat:u1", 10, 1);
    expect(r).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(txRateLimitUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ count: { lt: 10 } }) as Record<string, unknown> }) as Record<string, unknown>,
    );
  });

  it("does not allow a limit+1 burst when concurrent callers race (one conditional update wins)", async () => {
    txRateLimitUpsert.mockResolvedValue(undefined);
    // First caller wins (count 1), second caller's conditional update matches 0
    txRateLimitUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const r1: { ok: boolean; retryAfterSeconds: number } = await checkAndIncrement("chat:u1", 10, 1);
    const r2: { ok: boolean; retryAfterSeconds: number } = await checkAndIncrement("chat:u1", 10, 1);
    expect(r1).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(r2.ok).toBe(false);
    expect(txRateLimitUpsert).toHaveBeenCalledTimes(2);
    expect(txRateLimitUpdateMany).toHaveBeenCalledTimes(2);
  });

  it("increments the count atomically across calls in the same window (conditional updateMany)", async () => {
    txRateLimitUpsert.mockResolvedValue(undefined);
    txRateLimitUpdateMany.mockResolvedValue({ count: 1 });
    const r1: { ok: boolean; retryAfterSeconds: number } = await checkAndIncrement("chat:u1", 10, 1);
    const r2: { ok: boolean; retryAfterSeconds: number } = await checkAndIncrement("chat:u1", 10, 1);
    expect(r1).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(r2).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(txRateLimitUpdateMany).toHaveBeenCalledTimes(2);
    expect(txRateLimitUpsert).toHaveBeenCalledTimes(2);
  });
});
