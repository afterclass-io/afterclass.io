import { afterEach, describe, expect, it, vi } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";

// The schema reads the limit once, when its module loads. Each test sets the
// env first, resets the module cache, then imports the procedure fresh.
async function loadCaller(db: Record<string, unknown> = {}) {
  vi.resetModules();
  const { createTRPCRouter } = await import("@/server/api/trpc");
  const { upsertBudget } = await import("./index");
  const router = createTRPCRouter({ upsertBudget });
  return makeCaller(router.createCaller, db as never);
}

describe("userBids.upsertBudget balance limit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a balance above BID_MAX_BUDGET", async () => {
    vi.stubEnv("BID_MAX_BUDGET", "500");
    const caller = await loadCaller();

    await expect(
      caller.upsertBudget({ acadTermId: "t1", balance: 501 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("defaults the limit to 10000", async () => {
    vi.stubEnv("BID_MAX_BUDGET", "");
    const caller = await loadCaller();

    await expect(
      caller.upsertBudget({ acadTermId: "t1", balance: 10001 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts the limit itself", async () => {
    vi.stubEnv("BID_MAX_BUDGET", "500");
    const upsert = vi.fn().mockResolvedValue({ balance: 500 });
    const caller = await loadCaller({
      userBid: { aggregate: vi.fn().mockResolvedValue({ _sum: {} }) },
      userBidBudget: { upsert },
    });

    await expect(
      caller.upsertBudget({ acadTermId: "t1", balance: 500 }),
    ).resolves.toEqual({ balance: 500 });
  });
});
