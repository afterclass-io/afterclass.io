import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";

import { searchCourses } from "./index";

const router = createTRPCRouter({ searchCourses });

function makeCourseRow() {
  return {
    id: "c1",
    code: "CS101",
    name: "Intro to CS",
    creditUnits: 1,
    classes: [
      {
        id: "cls-1",
        section: "G1",
        professor: { name: "Dr X" },
        classTimings: [
          {
            dayOfWeek: "Mon",
            startTime: "12:00",
            endTime: "14:00",
            venue: "SR1",
          },
        ],
        classExamTimings: [
          {
            date: new Date("2024-12-01"),
            startTime: "09:00",
            endTime: "11:00",
            venue: "Hall",
          },
        ],
      },
      {
        id: "cls-2",
        section: "G2",
        professor: null,
        classTimings: [],
        classExamTimings: [],
      },
    ],
  };
}

function makeDb(rows: unknown[]) {
  return { courses: { findMany: vi.fn().mockResolvedValue(rows) } };
}

beforeEach(() => vi.clearAllMocks());

describe("timetable.searchCourses", () => {
  it("caps the result set at 20 rows", async () => {
    const db = makeDb([]);
    await makeCaller(router.createCaller, db, null).searchCourses({
      acadTermId: "T",
      query: "cs",
    });
    expect(db.courses.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 }),
    );
  });

  it("maps each course to sections with nested timings and a nullable professor", async () => {
    const db = makeDb([makeCourseRow()]);
    const res = await makeCaller(router.createCaller, db, null).searchCourses({
      acadTermId: "T",
      query: "intro",
    });

    expect(res).toEqual([
      {
        id: "c1",
        code: "CS101",
        name: "Intro to CS",
        creditUnits: 1,
        sections: [
          {
            classId: "cls-1",
            section: "G1",
            professorName: "Dr X",
            timings: [
              {
                dayOfWeek: "Mon",
                startTime: "12:00",
                endTime: "14:00",
                venue: "SR1",
              },
            ],
            examTimings: [
              {
                date: new Date("2024-12-01"),
                startTime: "09:00",
                endTime: "11:00",
                venue: "Hall",
              },
            ],
          },
          {
            classId: "cls-2",
            section: "G2",
            professorName: null,
            timings: [],
            examTimings: [],
          },
        ],
      },
    ]);
  });
});
