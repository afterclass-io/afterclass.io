import { describe, expect, it } from "vitest";
import { toRoadmapEntries } from "./ReadOnlyRoadmapBody";

describe("toRoadmapEntries", () => {
  it("maps API payload entries to grid entries, keeping a null description", () => {
    const payload = [
      {
        courseId: "c1",
        yearNumber: 1,
        term: "T1",
        course: {
          code: "CS101",
          name: "Intro to Computing",
          creditUnits: 4,
          description: null,
        },
      },
      {
        courseId: "c2",
        yearNumber: 2,
        term: "T3A",
        course: {
          code: "MA201",
          name: "Linear Algebra",
          creditUnits: 6,
          description: "Vectors and matrices",
        },
      },
    ];

    expect(toRoadmapEntries(payload)).toEqual([
      {
        courseId: "c1",
        courseCode: "CS101",
        courseName: "Intro to Computing",
        creditUnits: 4,
        description: null,
        yearNumber: 1,
        term: "T1",
      },
      {
        courseId: "c2",
        courseCode: "MA201",
        courseName: "Linear Algebra",
        creditUnits: 6,
        description: "Vectors and matrices",
        yearNumber: 2,
        term: "T3A",
      },
    ]);
  });

  it("returns an empty array for a roadmap with no entries", () => {
    expect(toRoadmapEntries([])).toEqual([]);
  });
});
