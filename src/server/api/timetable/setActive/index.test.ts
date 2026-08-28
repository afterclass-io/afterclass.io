import { describe, expect, it, vi, beforeEach } from "vitest";

import { createTRPCRouter } from "@/server/api/trpc";
import { setActive } from "./index";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

const router = createTRPCRouter({ setActive });

function makeCaller(dbMock: unknown) {
  return router.createCaller({
    db: dbMock,
    session: { user: { id: "u1" } },
    headers: new Headers(),
  } as never);
}

describe("timetable.setActive", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts slots for every SECURED-bid class of the term into the newly active plan", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockResolvedValue({ id: "t2", isActive: true });
    const findMany = vi.fn().mockResolvedValue([{ classId: "c1" }, { classId: "c2" }]);
    const createMany = vi.fn().mockResolvedValue({ count: 2 });
    const tx = {
      userTimetable: { updateMany, update },
      userBid: { findMany },
      userTimetableSlot: { createMany },
    };
    const dbMock = {
      userTimetable: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "t2", userId: "u1", acadTermId: "term-a" }),
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
    };
    const caller = makeCaller(dbMock);
    await caller.setActive({ timetableId: "t2" });

    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", acadTermId: "term-a" },
      data: { isActive: false },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "t2" },
      data: { isActive: true },
    });
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: "u1", status: "SECURED", class: { acadTermId: "term-a" } },
      select: { classId: true },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { timetableId: "t2", classId: "c1" },
        { timetableId: "t2", classId: "c2" },
      ],
      skipDuplicates: true,
    });
  });

  it("leaves the previous plan's slots untouched (decouples — only the new plan gets slots)", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockResolvedValue({ id: "t2", isActive: true });
    const findMany = vi.fn().mockResolvedValue([{ classId: "c1" }]);
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      userTimetable: { updateMany, update },
      userBid: { findMany },
      userTimetableSlot: { createMany },
    };
    const dbMock = {
      userTimetable: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "t2", userId: "u1", acadTermId: "term-a" }),
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
    };
    const caller = makeCaller(dbMock);
    await caller.setActive({ timetableId: "t2" });

    // Slots are only ever written into the newly active plan (t2) — nothing
    // touches the previous plan's rows.
    expect(createMany).toHaveBeenCalledWith({
      data: [{ timetableId: "t2", classId: "c1" }],
      skipDuplicates: true,
    });
  });

  it("does not create slots when the term has no SECURED bids", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockResolvedValue({ id: "t2", isActive: true });
    const findMany = vi.fn().mockResolvedValue([]);
    const createMany = vi.fn();
    const tx = {
      userTimetable: { updateMany, update },
      userBid: { findMany },
      userTimetableSlot: { createMany },
    };
    const dbMock = {
      userTimetable: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "t2", userId: "u1", acadTermId: "term-a" }),
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
    };
    const caller = makeCaller(dbMock);
    await caller.setActive({ timetableId: "t2" });
    expect(createMany).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when the timetable does not belong to the user", async () => {
    const dbMock = {
      userTimetable: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const caller = makeCaller(dbMock);
    await expect(caller.setActive({ timetableId: "t2" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("propagates slot-copy failure — transaction rolls back (no half-commit)", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockResolvedValue({ id: "t2", isActive: true });
    const findMany = vi.fn().mockResolvedValue([{ classId: "c1" }]);
    const createMany = vi.fn().mockRejectedValue(new Error("slot boom"));
    const tx = {
      userTimetable: { updateMany, update },
      userBid: { findMany },
      userTimetableSlot: { createMany },
    };
    const dbMock = {
      userTimetable: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "t2", userId: "u1", acadTermId: "term-a" }),
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
    };
    const caller = makeCaller(dbMock);
    await expect(caller.setActive({ timetableId: "t2" })).rejects.toThrow("slot boom");
    expect(createMany).toHaveBeenCalled();
    expect(dbMock.$transaction).toHaveBeenCalledTimes(1);
  });
});
