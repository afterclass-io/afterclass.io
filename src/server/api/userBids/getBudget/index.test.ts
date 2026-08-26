import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { getBudget } from "./index";

const router = createTRPCRouter({ getBudget });

describe("userBids.getBudget", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const dbMock = { userBidBudget: { findUnique: vi.fn() } };
    const caller = makeCaller(router.createCaller, dbMock, null);
    await expect(
      caller.getBudget({ acadTermId: "term-a" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns the balance for the caller's budget row for the term", async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValue({ userId: "u1", acadTermId: "term-a", balance: 300 });
    const caller = makeCaller(router.createCaller, {
      userBidBudget: { findUnique },
    });

    const result = await caller.getBudget({ acadTermId: "term-a" });

    expect(result).toEqual({ balance: 300 });
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        userId_acadTermId: { userId: "u1", acadTermId: "term-a" },
      },
    });
  });

  it("returns null when no budget row exists for the term", async () => {
    const caller = makeCaller(router.createCaller, {
      userBidBudget: { findUnique: vi.fn().mockResolvedValue(null) },
    });

    await expect(caller.getBudget({ acadTermId: "term-a" })).resolves.toBeNull();
  });
});
