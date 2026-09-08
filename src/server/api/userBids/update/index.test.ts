import { describe, expect, it, vi, beforeEach } from "vitest";

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
    update?: ReturnType<typeof vi.fn>;
  } = {},
) {
  // `in` checks (not `??`) so an explicit `null` overrides the default.
  const bid =
    "bid" in opts ? opts.bid : { userId: "u1", classId: "c1", bidWindowId: 5 };
  const window = "window" in opts ? opts.window : { acadTermId: "term-a" };
  const cls = "cls" in opts ? opts.cls : { acadTermId: "term-a" };
  return {
    userBid: {
      findUnique: vi.fn().mockResolvedValue(bid),
      update: opts.update ?? vi.fn().mockResolvedValue({ id: "b1" }),
    },
    bidWindow: { findUnique: vi.fn().mockResolvedValue(window) },
    classes: { findUnique: vi.fn().mockResolvedValue(cls) },
  };
}

describe("userBids.update", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const caller = makeCaller(router.createCaller, makeDb(), null);
    await expect(caller.update({ id: "b1", bidAmount: 50 })).rejects.toMatchObject(
      { code: "UNAUTHORIZED" },
    );
  });

  it("updates amount and notes without validating the class/window pair", async () => {
    const dbMock = makeDb();
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.update({ id: "b1", bidAmount: 120, notes: "hi" });

    expect(result).toEqual({ id: "b1" });
    expect(dbMock.bidWindow.findUnique).not.toHaveBeenCalled();
    expect(dbMock.userBid.update).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { bidAmount: 120, notes: "hi" },
    });
  });

  it("writes notes: null when notes is explicitly null (vs. omitted)", async () => {
    const dbMock = makeDb();
    const caller = makeCaller(router.createCaller, dbMock);

    await caller.update({ id: "b1", notes: null });

    expect(dbMock.userBid.update).toHaveBeenCalledWith({
      where: { id: "b1" },
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
      where: { id: "b1" },
      data: { classId: "c2" },
    });
  });

  it("throws FORBIDDEN when the bid belongs to another user", async () => {
    const dbMock = makeDb({ bid: { userId: "someone-else", classId: "c1", bidWindowId: 5 } });
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(caller.update({ id: "b1", bidAmount: 50 })).rejects.toMatchObject(
      { code: "FORBIDDEN" },
    );
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
});
