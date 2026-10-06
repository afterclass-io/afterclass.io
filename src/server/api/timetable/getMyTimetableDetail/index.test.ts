import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";

import { getMyTimetableDetail } from "./index";

const router = createTRPCRouter({ getMyTimetableDetail });

function makeMockSlot(classId: string, dayOfWeek = "Mon", startTime = "08:15", endTime = "11:30") {
  return {
    class: {
      id: classId,
      section: "G1",
      course: { id: "course-1", code: "IS216", name: "Cloud Computing", creditUnits: 1 },
      professor: { id: "prof-1", name: "Prof Tan" },
      classTimings: [
        {
          id: 101,
          dayOfWeek,
          startTime,
          endTime,
          venue: "SOE SR 2-1",
        },
      ],
      classExamTimings: [
        {
          id: 201,
          date: new Date("2026-11-20"),
          dayOfWeek: "Fri",
          startTime: "09:00",
          endTime: "11:00",
          venue: "Hall",
        },
      ],
    },
  };
}

const session = { user: { id: "user-123" } };

beforeEach(() => vi.clearAllMocks());

describe("timetable.getMyTimetableDetail", () => {
  it("returns null when no timetable is found for the user", async () => {
    const db = {
      userTimetable: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    const caller = makeCaller(router.createCaller, db, session);
    const result = await caller.getMyTimetableDetail({ acadTermId: "term-1" });
    expect(result).toBeNull();
  });

  it("finds the active timetable for a specified acadTermId", async () => {
    const mockTimetable = {
      id: "tt-active",
      name: "Plan A",
      isActive: true,
      acadTermId: "term-1",
      slots: [makeMockSlot("class-1", "Mon", "08:15", "11:30")],
    };

    const db = {
      userTimetable: {
        findFirst: vi.fn().mockResolvedValue(mockTimetable),
      },
    };

    const caller = makeCaller(router.createCaller, db, session);
    const result = await caller.getMyTimetableDetail({ acadTermId: "term-1" });

    expect(db.userTimetable.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-123", acadTermId: "term-1", isActive: true },
      }),
    );

    expect(result).toEqual({
      timetableId: "tt-active",
      name: "Plan A",
      isActive: true,
      acadTermId: "term-1",
      slots: [
        {
          classId: "class-1",
          courseId: "course-1",
          courseCode: "IS216",
          courseName: "Cloud Computing",
          section: "G1",
          day: "Mon",
          dayOfWeek: "Mon",
          startTime: "08:15",
          endTime: "11:30",
          venue: "SOE SR 2-1",
          professor: "Prof Tan",
          creditUnits: 1,
        },
      ],
      examTimings: [
        {
          classId: "class-1",
          courseId: "course-1",
          courseCode: "IS216",
          section: "G1",
          date: new Date("2026-11-20").toISOString(),
          dayOfWeek: "Fri",
          startTime: "09:00",
          endTime: "11:00",
          venue: "Hall",
        },
      ],
    });
  });

  it("fetches directly by timetableId if supplied", async () => {
    const mockTimetable = {
      id: "tt-specific",
      name: "Plan B",
      isActive: false,
      acadTermId: "term-2",
      slots: [],
    };

    const db = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue(mockTimetable),
      },
    };

    const caller = makeCaller(router.createCaller, db, session);
    const result = await caller.getMyTimetableDetail({ timetableId: "tt-specific" });

    expect(db.userTimetable.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tt-specific", userId: "user-123" },
      }),
    );
    expect(result?.timetableId).toBe("tt-specific");
  });
});
