import { describe, expect, it, vi, beforeEach } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { update } from "./index";

const router = createTRPCRouter({ update });

/**
 * requireOwnedBid reads userBid.findUnique; validateClassWindowPair walks
 * bidWindow.findUnique then assertClassInTerm → classes.findUnique; the write
 * is userBid.update.
 */
function makeDb(
  opts: {
    bid?: unknown;
    window?: unknown;
    cls?: unknown;
    budget?: unknown;
    aggregate?: unknown;
    update?: ReturnType<typeof vi.fn>;
    $transaction?: ReturnType<typeof vi.fn>;
  } = {},
) {
  // `in` checks (not `??`) so an explicit `null` overrides the default.
  const bid =
    "bid" in opts ? opts.bid : { userId: "u1", classId: "c1", bidWindowId: 5 };
  const window = "window" in opts ? opts.window : { acadTermId: "term-a" };
  const cls = "cls" in opts ? opts.cls : { acadTermId: "term-a" };
  const budget = "budget" in opts ? opts.budget : null;
  const aggregate =
    "aggregate" in opts ? opts.aggregate : { _sum: { bidAmount: 0 } };

  const dbMock: {
    userBid: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      aggregate: ReturnType<typeof vi.fn>;
    };
    userBidBudget: { findUnique: ReturnType<typeof vi.fn> };
    bidWindow: { findUnique: ReturnType<typeof vi.fn> };
    classes: { findUnique: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  } = {
    userBid: {
      findUnique: vi.fn().mockResolvedValue(bid),
      update: opts.update ?? vi.fn().mockResolvedValue({ id: "b1" }),
      aggregate: vi.fn().mockResolvedValue(aggregate),
    },
    userBidBudget: { findUnique: vi.fn().mockResolvedValue(budget) },
    bidWindow: { findUnique: vi.fn().mockResolvedValue(window) },
    classes: { findUnique: vi.fn().mockResolvedValue(cls) },
    $transaction:
      opts.$transaction ??
      vi.fn(async (cb: (tx: unknown) => unknown) => cb(dbMock)),
  };
  return dbMock;
}

describe("userBids.update", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const caller = makeCaller(router.createCaller, makeDb(), null);
    await expect(
      caller.update({ id: "b1", bidAmount: 50 }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("updates amount and notes without validating the class/window pair", async () => {
    const dbMock = makeDb();
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.update({
      id: "b1",
      bidAmount: 120,
      notes: "hi",
    });

    expect(result).toEqual({ id: "b1" });
    expect(dbMock.bidWindow.findUnique).not.toHaveBeenCalled();
    expect(dbMock.userBid.update).toHaveBeenCalledWith({
      where: { id: "b1", userId: "u1" },
      data: { bidAmount: 120, notes: "hi" },
    });
  });

  it("writes notes: null when notes is explicitly null (vs. omitted)", async () => {
    const dbMock = makeDb();
    const caller = makeCaller(router.createCaller, dbMock);

    await caller.update({ id: "b1", notes: null });

    expect(dbMock.userBid.update).toHaveBeenCalledWith({
      where: { id: "b1", userId: "u1" },
      data: { notes: null },
    });
  });

  it("validates the pair and writes the new classId when the class changes", async () => {
    const dbMock = makeDb();
    const caller = makeCaller(router.createCaller, dbMock);

    await caller.update({ id: "b1", classId: "c2" });

    expect(dbMock.bidWindow.findUnique).toHaveBeenCalledWith({
      where: { id: 5 },
      select: { acadTermId: true },
    });
    expect(dbMock.classes.findUnique).toHaveBeenCalledWith({
      where: { id: "c2" },
      select: { acadTermId: true },
    });
    expect(dbMock.userBid.update).toHaveBeenCalledWith({
      where: { id: "b1", userId: "u1" },
      data: { classId: "c2" },
    });
  });

  it("throws FORBIDDEN when the bid belongs to another user", async () => {
    const dbMock = makeDb({
      bid: { userId: "someone-else", classId: "c1", bidWindowId: 5 },
    });
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(
      caller.update({ id: "b1", bidAmount: 50 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.userBid.update).not.toHaveBeenCalled();
  });

  it("throws BAD_REQUEST for an unknown bid window", async () => {
    const dbMock = makeDb({ window: null });
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(
      caller.update({ id: "b1", bidWindowId: 99 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMock.userBid.update).not.toHaveBeenCalled();
  });

  it("throws BAD_REQUEST when the class is not in the window's term", async () => {
    const dbMock = makeDb({
      window: { acadTermId: "term-a" },
      cls: { acadTermId: "term-b" },
    });
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(
      caller.update({ id: "b1", classId: "c2" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMock.userBid.update).not.toHaveBeenCalled();
  });

  it("rejects BAD_REQUEST when a SECURED bid is raised past budget", async () => {
    const dbMock = makeDb({
      bid: {
        userId: "u1",
        classId: "c1",
        bidWindowId: 5,
        bidAmount: 40,
        status: "SECURED",
      },
      budget: { balance: 100 },
      aggregate: { _sum: { bidAmount: 80 } },
    });
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(
      caller.update({ id: "b1", bidAmount: 70 }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Marking this bid as secured would exceed your budget",
    });
    expect(dbMock.$transaction).toHaveBeenCalled();
    expect(dbMock.userBid.update).not.toHaveBeenCalled();
  });

  it("succeeds through $transaction when a SECURED bid is raised within budget", async () => {
    const dbMock = makeDb({
      bid: {
        userId: "u1",
        classId: "c1",
        bidWindowId: 5,
        bidAmount: 40,
        status: "SECURED",
      },
      budget: { balance: 100 },
      aggregate: { _sum: { bidAmount: 20 } },
    });
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.update({ id: "b1", bidAmount: 70 });

    expect(result).toEqual({ id: "b1" });
    expect(dbMock.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(dbMock.userBid.update).toHaveBeenCalledWith({
      where: { id: "b1", userId: "u1" },
      data: { bidAmount: 70 },
    });
  });

  it("bases the budget check on the in-transaction read, not the stale pre-read", async () => {
    const stale = {
      userId: "u1",
      classId: "c1",
      bidWindowId: 5,
      bidAmount: 40,
      status: "SECURED",
    };
    const dbMock = makeDb({
      bid: stale,
      budget: { balance: 100 },
      aggregate: { _sum: { bidAmount: 80 } },
    });
    // The pre-read sees SECURED; by the time the transaction reads, the bid
    // was moved to PLANNED, so no budget check applies.
    dbMock.userBid.findUnique
      .mockResolvedValueOnce(stale)
      .mockResolvedValueOnce({ ...stale, status: "PLANNED" });
    const caller = makeCaller(router.createCaller, dbMock);

    await caller.update({ id: "b1", bidAmount: 70 });

    expect(dbMock.userBidBudget.findUnique).not.toHaveBeenCalled();
    expect(dbMock.userBid.update).toHaveBeenCalled();
  });

  it("does not call $transaction when a non-secured bid amount is updated", async () => {
    const dbMock = makeDb({
      bid: {
        userId: "u1",
        classId: "c1",
        bidWindowId: 5,
        bidAmount: 40,
        status: "PLANNED",
      },
    });
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.update({ id: "b1", bidAmount: 70 });

    expect(result).toEqual({ id: "b1" });
    expect(dbMock.$transaction).not.toHaveBeenCalled();
    expect(dbMock.userBid.update).toHaveBeenCalledWith({
      where: { id: "b1", userId: "u1" },
      data: { bidAmount: 70 },
    });
  });
});
