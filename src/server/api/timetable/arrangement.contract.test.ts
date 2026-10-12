import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";

import { getArrangement } from "./getArrangement";

const router = createTRPCRouter({ getArrangement });

const session = { user: { id: "user-42" } };

/** One slot with a class, course, professor and one weekly timing. */
const timetable = {
  id: "tt1",
  slots: [
    {
      class: {
        id: "cls-1",
        section: "G1",
        course: { id: "c1", code: "CS101", name: "Intro", creditUnits: 4 },
        professor: { id: "p1", name: "Dr X" },
        classTimings: [
          {
            id: 7,
            dayOfWeek: "Mon",
            startTime: "12:00",
            endTime: "14:00",
            venue: "SR1",
          },
        ],
        classExamTimings: [],
      },
    },
  ],
};

function makeDb(found: unknown) {
  return {
    userTimetable: { findUnique: vi.fn().mockResolvedValue(found) },
    userBid: { findMany: vi.fn().mockResolvedValue([]) },
  };
}

beforeEach(() => vi.clearAllMocks());

describe("timetable.getArrangement contract", () => {
  it("returns the exact arranged shape for a fixed timetable", async () => {
    const db = makeDb(timetable);
    const res = await makeCaller(
      router.createCaller,
      db,
      session,
    ).getArrangement({ timetableId: "tt1" });

    expect(res).toEqual({
      slots: [
        {
          classId: "cls-1",
          courseCode: "CS101",
          courseName: "Intro",
          section: "G1",
          professorName: "Dr X",
          creditUnits: 4,
          timings: [
            {
              dayOfWeek: "Mon",
              startTime: "12:00",
              endTime: "14:00",
              venue: "SR1",
            },
          ],
          examTimings: [],
        },
      ],
      bids: [],
    });
  });

  it("throws NOT_FOUND when findUnique returns null", async () => {
    const db = makeDb(null);
    await expect(
      makeCaller(router.createCaller, db, session).getArrangement({
        timetableId: "tt1",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("scopes the lookup to the timetable id and the session user", async () => {
    const db = makeDb(timetable);
    await makeCaller(router.createCaller, db, session).getArrangement({
      timetableId: "tt1",
    });
    expect(db.userTimetable.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tt1", userId: "user-42" },
      }),
    );
  });

  it("selects the class fields the arrangement reads", async () => {
    const db = makeDb(timetable);
    await makeCaller(router.createCaller, db, session).getArrangement({
      timetableId: "tt1",
    });
    expect(db.userTimetable.findUnique.mock.calls[0]?.[0]).toMatchObject({
      select: {
        slots: {
          select: {
            class: {
              select: {
                id: true,
                section: true,
                course: {},
                professor: {},
                classTimings: {},
              },
            },
          },
        },
      },
    });
  });
});
