import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// vi.mock factories are hoisted above top-level const declarations, so the mock
// fns must be created via vi.hoisted to avoid a TDZ ("Cannot access ... before
// initialization") error. Test names and assertions are unchanged from the plan.
const { findUnique, upsert } = vi.hoisted(() => ({
  findUnique: vi.fn() as Mock,
  upsert: vi.fn() as Mock,
}));

vi.mock("@/server/db", () => ({ db: { rateLimit: { findUnique, upsert } } }));

import { checkAndIncrement } from "./ratelimit";

describe("checkAndIncrement", () => {
  beforeEach(() => { findUnique.mockReset(); upsert.mockReset(); });

  it("allows within the limit and increments", async () => {
    findUnique.mockResolvedValue({ count: 1 });
    const r = await checkAndIncrement("chat:u1", 10, 1);
    expect(r).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: expect.stringContaining("chat:u1:") as string },
        update: { count: { increment: 1 } },
      }) as Record<string, unknown>,
    );
  });

  it("blocks over the limit with a retry hint", async () => {
    findUnique.mockResolvedValue({ count: 10 });
    const r = await checkAndIncrement("chat:u1", 10, 1);
    expect(r.ok).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThan(0);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("creates a new row on the first call in a window", async () => {
    findUnique.mockResolvedValue(null);
    const r = await checkAndIncrement("chat:u1", 10, 1);
    expect(r).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: expect.stringContaining("chat:u1:") as string },
        // Asymmetric matchers typed as `any` - see above.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        create: expect.objectContaining({ key: expect.stringContaining("chat:u1:") as string, count: 0 }),
        update: {},
      }) as Record<string, unknown>,
    );
  });

  it("allows exactly one below the limit (boundary)", async () => {
    findUnique.mockResolvedValue({ count: 9 });
    const r = await checkAndIncrement("chat:u1", 10, 1);
    expect(r).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(upsert).toHaveBeenCalled();
  });

  it("increments the count across calls in the same window", async () => {
    // The mocked db fns hold no state, so simulate a persisted row in the test.
    let persisted: { count: number } | null = { count: 1 };
    findUnique.mockImplementation(async () => persisted);
    upsert.mockImplementation(async () => {
      persisted = { count: (persisted?.count ?? 0) + 1 };
    });

    const r1 = await checkAndIncrement("chat:u1", 10, 1);
    const r2 = await checkAndIncrement("chat:u1", 10, 1);

    expect(r1).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(r2).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(findUnique).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledTimes(2);
  });
});
