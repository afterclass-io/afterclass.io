import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { spentForTerm, assertSecuredWithinBudget } from "./assert-budget";
import { createTRPCRouter } from "@/server/api/trpc";
import { upsertBudget } from "./upsertBudget";

const router = createTRPCRouter({ upsertBudget });

describe("spentForTerm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sums SECURED bid amounts for the user+term", async () => {
    const aggregate = vi.fn().mockResolvedValue({ _sum: { bidAmount: 250 } });
    const spent = await spentForTerm(
      { userBid: { aggregate } } as never,
      "u1",
      "term-a",
    );
    expect(spent).toBe(250);
    expect(aggregate).toHaveBeenCalledWith({
      _sum: { bidAmount: true },
      where: {
        userId: "u1",
        status: "SECURED",
        class: { acadTermId: "term-a" },
      },
    });
  });

  it("returns 0 when no SECURED bids exist", async () => {
    const aggregate = vi.fn().mockResolvedValue({ _sum: { bidAmount: null } });
    const spent = await spentForTerm(
      { userBid: { aggregate } } as never,
      "u1",
      "term-a",
    );
    expect(spent).toBe(0);
  });

  it("excludes a bid id when provided", async () => {
    const aggregate = vi.fn().mockResolvedValue({ _sum: { bidAmount: 100 } });
    await spentForTerm(
      { userBid: { aggregate } } as never,
      "u1",
      "term-a",
      "b9",
    );
    expect(aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: expect.objectContaining({ id: { not: "b9" } }),
      }),
    );
  });
});

describe("assertSecuredWithinBudget", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws BAD_REQUEST when securing would push spent over budget", async () => {
    const db = {
      userBidBudget: {
        findUnique: vi.fn().mockResolvedValue({ balance: 200 }),
      },
      userBid: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { bidAmount: 150 } }),
      },
    };
    await expect(
      assertSecuredWithinBudget(db as never, "u1", "term-a", 60),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("passes when securing stays within budget", async () => {
    const db = {
      userBidBudget: {
        findUnique: vi.fn().mockResolvedValue({ balance: 200 }),
      },
      userBid: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { bidAmount: 150 } }),
      },
    };
    await expect(
      assertSecuredWithinBudget(db as never, "u1", "term-a", 50),
    ).resolves.toBeUndefined();
  });

  it("allows any amount when no budget row exists (no cap)", async () => {
    const db = {
      userBidBudget: { findUnique: vi.fn().mockResolvedValue(null) },
      userBid: { aggregate: vi.fn() },
    };
    await expect(
      assertSecuredWithinBudget(db as never, "u1", "term-a", 9999),
    ).resolves.toBeUndefined();
    expect(db.userBid.aggregate).not.toHaveBeenCalled();
  });
});

describe("userBids.upsertBudget — balance cannot go below spent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws BAD_REQUEST when the new balance is below current spent", async () => {
    const dbMock = {
      userBid: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { bidAmount: 180 } }),
      },
      userBidBudget: { upsert: vi.fn() },
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(
      caller.upsertBudget({ acadTermId: "term-a", balance: 100 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMock.userBidBudget.upsert).not.toHaveBeenCalled();
  });

  it("allows a balance exactly equal to current spent and upserts it keyed by (userId, acadTermId)", async () => {
    const dbMock = {
      userBid: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { bidAmount: 100 } }),
      },
      userBidBudget: {
        upsert: vi.fn().mockResolvedValue({ balance: 100 }),
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);
    const result = await caller.upsertBudget({
      acadTermId: "term-a",
      balance: 100,
    });
    expect(result).toEqual({ balance: 100 });
    expect(dbMock.userBidBudget.upsert).toHaveBeenCalledWith({
      where: {
        userId_acadTermId: { userId: "u1", acadTermId: "term-a" },
      },
      create: { userId: "u1", acadTermId: "term-a", balance: 100 },
      update: { balance: 100 },
    });
  });
});
