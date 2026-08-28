import { describe, expect, it, vi, beforeEach } from "vitest";

import { createTRPCRouter } from "@/server/api/trpc";
import { removeSlot } from "./index";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

const router = createTRPCRouter({ removeSlot });

function makeCaller(dbMock: unknown) {
  return router.createCaller({
    db: dbMock,
    session: { user: { id: "u1" } },
    headers: new Headers(),
  } as never);
}

describe("timetable.removeSlot", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the slot for the owned timetable", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const dbMock = {
      userTimetable: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "t1", userId: "u1", acadTermId: "term-a" }),
      },
      userTimetableSlot: { deleteMany },
    };
    const caller = makeCaller(dbMock);
    const result = await caller.removeSlot({
      timetableId: "t1",
      classId: "c1",
    });
    expect(result).toEqual({ success: true });
    expect(deleteMany).toHaveBeenCalledWith({
      where: { timetableId: "t1", classId: "c1" },
    });
  });

  it("is idempotent when the slot does not exist", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const dbMock = {
      userTimetable: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "t1", userId: "u1", acadTermId: "term-a" }),
      },
      userTimetableSlot: { deleteMany },
    };
    const caller = makeCaller(dbMock);
    // A missing slot (e.g. double-clicked remove) is already the desired
    // end state — still succeeds, no throw.
    await expect(
      caller.removeSlot({ timetableId: "t1", classId: "c1" }),
    ).resolves.toEqual({ success: true });
  });

  it("rejects when the timetable belongs to another user", async () => {
    const deleteMany = vi.fn();
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      userTimetableSlot: { deleteMany },
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.removeSlot({ timetableId: "t1", classId: "c1" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
