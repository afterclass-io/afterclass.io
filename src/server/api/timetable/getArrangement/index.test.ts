import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";

import { getArrangement } from "./index";

const router = createTRPCRouter({ getArrangement });

/** One slot shaped like the procedure's `select`, consumed by toArrangedClass. */
function makeSlot(classId: string, professor: { name: string } | null) {
  return {
    class: {
      id: classId,
      section: "G1",
      course: { id: "c1", code: "CS101", name: "Intro", creditUnits: 1 },
      professor,
      classTimings: [
        {
          id: 1,
          dayOfWeek: "Mon",
          startTime: "12:00",
          endTime: "14:00",
          venue: "SR1",
        },
      ],
      classExamTimings: [
        {
          id: 2,
          date: new Date("2024-12-01"),
          dayOfWeek: "Sat",
          startTime: "09:00",
          endTime: "11:00",
          venue: "Hall",
        },
      ],
    },
  };
}

function makeDb(timetable: unknown, bids: unknown[] = []) {
  return {
    userTimetable: { findUnique: vi.fn().mockResolvedValue(timetable) },
    userBid: { findMany: vi.fn().mockResolvedValue(bids) },
  };
}

const session = { user: { id: "u1" } };

beforeEach(() => vi.clearAllMocks());

describe("timetable.getArrangement", () => {
  it("throws NOT_FOUND when the timetable is not the caller's", async () => {
    const db = makeDb(null);
    await expect(
      makeCaller(router.createCaller, db, session).getArrangement({
        timetableId: "tt1",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns empty slots and skips the bid query when the timetable has no classes", async () => {
    const db = makeDb({ id: "tt1", slots: [] });
    const res = await makeCaller(router.createCaller, db, session).getArrangement(
      { timetableId: "tt1" },
    );
    expect(res).toEqual({ slots: [], bids: [] });
    expect(db.userBid.findMany).not.toHaveBeenCalled();
  });

  it("maps slots to arranged classes and co-locates the caller's bids", async () => {
    const bidRow = {
      classId: "cls-1",
      bidAmount: 10,
      status: "SECURED",
      bidWindow: { round: "1" },
    };
    const db = makeDb(
      {
        id: "tt1",
        slots: [makeSlot("cls-1", { name: "Dr X" }), makeSlot("cls-2", null)],
      },
      [bidRow],
    );

    const res = await makeCaller(router.createCaller, db, session).getArrangement(
      { timetableId: "tt1" },
    );

    expect(db.userBid.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1", classId: { in: ["cls-1", "cls-2"] } },
      }),
    );
    expect(res.bids).toEqual([bidRow]);
    expect(res.slots).toHaveLength(2);
    expect(res.slots[0]).toMatchObject({
      classId: "cls-1",
      courseCode: "CS101",
      section: "G1",
      professorName: "Dr X",
      timings: [
        { dayOfWeek: "Mon", startTime: "12:00", endTime: "14:00", venue: "SR1" },
      ],
    });
    expect(res.slots[1]!.professorName).toBeNull();
  });
});
