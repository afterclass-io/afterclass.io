import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { demoteSiblingBids, syncSecuredBidToActiveTimetable } from "./sync-secured";
import { createTRPCRouter } from "@/server/api/trpc";
import { setStatus } from "./setStatus";

const router = createTRPCRouter({ setStatus });

/** Build a db mock wired to an interactive-transaction callback. */
function makeSetStatusDb() {
  const userBidUpdate = vi.fn().mockResolvedValue({ id: "b1" });
  const userBidUpdateMany = vi.fn().mockResolvedValue({ count: 0 });
  const slotCreateMany = vi.fn().mockResolvedValue({ count: 1 });
  const timetableFindFirst = vi.fn();
  const timetableCount = vi.fn().mockResolvedValue(0);
  const timetableCreate = vi.fn();

  const dbMock = {
    userBid: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: "b1", userId: "u1", classId: "c1", bidAmount: 50 }),
      findFirst: vi.fn().mockResolvedValue(null),
      aggregate: vi.fn().mockResolvedValue({ _sum: { bidAmount: null } }),
    },
    classes: {
      findUnique: vi.fn().mockResolvedValue({ acadTermId: "term-a", courseId: "course-1" }),
    },
    userBidBudget: { findUnique: vi.fn().mockResolvedValue(null) },
    userTimetable: {
      findFirst: timetableFindFirst,
      count: timetableCount,
      create: timetableCreate,
    },
    userTimetableSlot: { createMany: slotCreateMany },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        userBid: { update: userBidUpdate, updateMany: userBidUpdateMany },
        userTimetable: {
          findFirst: timetableFindFirst,
          count: timetableCount,
          create: timetableCreate,
        },
        userTimetableSlot: { createMany: slotCreateMany },
      }),
    ),
  };
  return {
    dbMock,
    userBidUpdate,
    userBidUpdateMany,
    slotCreateMany,
    timetableFindFirst,
    timetableCount,
    timetableCreate,
  };
}

describe("demoteSiblingBids", () => {
  beforeEach(() => vi.clearAllMocks());

  it("flips sibling bids for the same class to PARTICIPATED, keeping the current bid", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    await demoteSiblingBids({ userBid: { updateMany } } as never, "u1", "c1", "b1");
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "u1",
          classId: "c1",
          id: { not: "b1" },
          status: { in: ["PLANNED", "SECURED", "DROPPED", "CANCELLED"] },
        },
        data: { status: "PARTICIPATED" },
      }),
    );
  });
});

describe("syncSecuredBidToActiveTimetable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts the class into the existing active plan (skipDuplicates, no duplicate rows)", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "t1", acadTermId: "term-a", isActive: true });
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    await syncSecuredBidToActiveTimetable(
      {
        userTimetable: { findFirst, count: vi.fn(), create: vi.fn() },
        userTimetableSlot: { createMany },
      } as never,
      "u1",
      "term-a",
      "c1",
    );
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: "u1", acadTermId: "term-a", isActive: true },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [{ timetableId: "t1", classId: "c1" }],
      skipDuplicates: true,
    });
  });

  it("creates a default active timetable (auto-named) when none exists", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const count = vi.fn().mockResolvedValue(0);
    const create = vi.fn().mockResolvedValue({ id: "t1", acadTermId: "term-a", isActive: true });
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    await syncSecuredBidToActiveTimetable(
      {
        userTimetable: { findFirst, count, create },
        userTimetableSlot: { createMany },
      } as never,
      "u1",
      "term-a",
      "c1",
    );
    expect(create).toHaveBeenCalledWith({
      data: { userId: "u1", acadTermId: "term-a", name: "Plan A", isActive: true },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [{ timetableId: "t1", classId: "c1" }],
      skipDuplicates: true,
    });
  });
});

describe("userBids.setStatus — active-timetable sync", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marking SECURED adds the class to the user's active timetable for the term", async () => {
    const { dbMock, userBidUpdate, userBidUpdateMany, slotCreateMany, timetableFindFirst } =
      makeSetStatusDb();
    timetableFindFirst.mockResolvedValue({
      id: "t1",
      acadTermId: "term-a",
      isActive: true,
    });

    const caller = makeCaller(router.createCaller, dbMock);
    await caller.setStatus({ id: "b1", status: "SECURED" });

    expect(userBidUpdate).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { status: "SECURED" },
    });
    // Siblings demoted to PARTICIPATED…
    expect(userBidUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ classId: "c1", id: { not: "b1" } }) as Record<
          string,
          unknown
        >,
        data: { status: "PARTICIPATED" },
      }),
    );
    // …and the class mirrored onto the active timetable.
    expect(slotCreateMany).toHaveBeenCalledWith({
      data: [{ timetableId: "t1", classId: "c1" }],
      skipDuplicates: true,
    });
  });

  it("marking SECURED creates a default active timetable when none exists", async () => {
    const { dbMock, slotCreateMany, timetableFindFirst, timetableCount, timetableCreate } =
      makeSetStatusDb();
    timetableFindFirst.mockResolvedValue(null);
    timetableCount.mockResolvedValue(0);
    timetableCreate.mockResolvedValue({
      id: "t1",
      acadTermId: "term-a",
      isActive: true,
    });

    const caller = makeCaller(router.createCaller, dbMock);
    await caller.setStatus({ id: "b1", status: "SECURED" });

    expect(timetableCreate).toHaveBeenCalledWith({
      data: { userId: "u1", acadTermId: "term-a", name: "Plan A", isActive: true },
    });
    expect(slotCreateMany).toHaveBeenCalledWith({
      data: [{ timetableId: "t1", classId: "c1" }],
      skipDuplicates: true,
    });
  });

  it("marking DROPPED flips siblings to PARTICIPATED but touches no timetable", async () => {
    const { dbMock, userBidUpdate, userBidUpdateMany, slotCreateMany } = makeSetStatusDb();

    const caller = makeCaller(router.createCaller, dbMock);
    await caller.setStatus({ id: "b1", status: "DROPPED" });

    expect(userBidUpdate).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { status: "DROPPED" },
    });
    expect(userBidUpdateMany).toHaveBeenCalled();
    expect(slotCreateMany).not.toHaveBeenCalled();
  });

  it("marking PLANNED/CANCELLED also flips siblings but never touches the timetable", async () => {
    for (const status of ["PLANNED", "CANCELLED"] as const) {
      const { dbMock, userBidUpdateMany, slotCreateMany } = makeSetStatusDb();
      const caller = makeCaller(router.createCaller, dbMock);
      await caller.setStatus({ id: "b1", status });
      expect(userBidUpdateMany).toHaveBeenCalled();
      expect(slotCreateMany).not.toHaveBeenCalled();
    }
  });

  it("allows PARTICIPATED via the dropdown (same-window siblings default to participated)", async () => {
    const { dbMock, userBidUpdate } = makeSetStatusDb();
    const caller = makeCaller(router.createCaller, dbMock);
    await caller.setStatus({ id: "b1", status: "PARTICIPATED" });
    expect(userBidUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "b1" }, data: { status: "PARTICIPATED" } }),
    );
  });

  it("demotes sibling SECURED bids for the same class to PARTICIPATED (one active row per class)", async () => {
    const { dbMock, userBidUpdateMany, timetableFindFirst } = makeSetStatusDb();
    timetableFindFirst.mockResolvedValue({
      id: "t1",
      acadTermId: "term-a",
      isActive: true,
    });
    const caller = makeCaller(router.createCaller, dbMock);
    await caller.setStatus({ id: "b1", status: "SECURED" });
    expect(userBidUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          classId: "c1",
          id: { not: "b1" },
          status: { in: ["PLANNED", "SECURED", "DROPPED", "CANCELLED"] },
        }) as Record<string, unknown>,
        data: { status: "PARTICIPATED" },
      }),
    );
  });

  it("enforces at most one SECURED per course per term (duplicate SECURED guarded)", async () => {
    const { dbMock } = makeSetStatusDb();
    // Simulate an existing SECURED bid for same course+term but different section/class
    (dbMock.userBid.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "other-secured",
    });
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(caller.setStatus({ id: "b1", status: "SECURED" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("rejects an invalid status with a zod validation error", async () => {
    const { dbMock } = makeSetStatusDb();
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(caller.setStatus({ id: "b1", status: "INVALID" as never })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});

describe("userBids.setStatus — guards and P2002 retry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws FORBIDDEN when the bid is not owned by the caller", async () => {
    const { dbMock, userBidUpdate } = makeSetStatusDb();
    (dbMock.userBid.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(caller.setStatus({ id: "b1", status: "DROPPED" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(userBidUpdate).not.toHaveBeenCalled();
  });

  it("throws BAD_REQUEST when the bid's class no longer exists", async () => {
    const { dbMock, userBidUpdate } = makeSetStatusDb();
    (dbMock.classes.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(caller.setStatus({ id: "b1", status: "DROPPED" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(userBidUpdate).not.toHaveBeenCalled();
  });

  it("throws BAD_REQUEST before any write when securing would exceed the term budget", async () => {
    const { dbMock, userBidUpdate } = makeSetStatusDb();
    (dbMock.userBidBudget.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      balance: 100,
    });
    (dbMock.userBid.aggregate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      _sum: { bidAmount: 90 },
    });
    const caller = makeCaller(router.createCaller, dbMock);
    // bid.bidAmount is 50 (see makeSetStatusDb); 90 spent + 50 > 100 budget.
    await expect(caller.setStatus({ id: "b1", status: "SECURED" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(userBidUpdate).not.toHaveBeenCalled();
  });

  it("retries the whole transaction once on a P2002 race and returns the result", async () => {
    const { dbMock, timetableFindFirst } = makeSetStatusDb();
    timetableFindFirst.mockResolvedValue({
      id: "t1",
      acadTermId: "term-a",
      isActive: true,
    });
    dbMock.$transaction.mockRejectedValueOnce({ code: "P2002" });

    const caller = makeCaller(router.createCaller, dbMock);
    const result = await caller.setStatus({ id: "b1", status: "SECURED" });

    expect(dbMock.$transaction).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ id: "b1" });
  });

  it("re-throws a non-P2002 transaction error without retrying", async () => {
    const { dbMock } = makeSetStatusDb();
    dbMock.$transaction.mockRejectedValue(new Error("boom"));

    const caller = makeCaller(router.createCaller, dbMock);
    await expect(caller.setStatus({ id: "b1", status: "SECURED" })).rejects.toThrow("boom");
    expect(dbMock.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe("demoteSiblingBids — scope", () => {
  it("demotes all other rows with the same classId regardless of bidWindowId", async () => {
    // demoteSiblingBids filters only by classId/userId/id — bidWindowId is never
    // part of the where clause, so siblings across different bid windows are
    // still demoted.
    const updateMany = vi.fn(async (_args: { where: Record<string, unknown> }) => ({
      count: 2,
    }));
    await demoteSiblingBids({ userBid: { updateMany } } as never, "u1", "c1", "b1");
    const where = updateMany.mock.calls[0]![0].where;
    expect(where).not.toHaveProperty("bidWindowId");
    expect(where).toEqual(
      expect.objectContaining({
        userId: "u1",
        classId: "c1",
        id: { not: "b1" },
      }),
    );
  });
});
