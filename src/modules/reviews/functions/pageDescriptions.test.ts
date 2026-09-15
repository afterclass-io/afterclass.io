import { describe, expect, it } from "vitest";

import { courseDescription, professorDescription } from "./pageDescriptions";

const baseCourse = {
  course: {
    name: "Digital Business - Technologies and Transformation",
    code: "IS215",
  },
  averageRating: 4.11,
  reviewCount: 9,
  reviewLabels: [
    { name: "Engaging", count: 3 },
    { name: "Practical", count: 0 },
  ],
  professorCount: 6,
};

const baseProfessor = {
  professor: { name: "OUH Eng Lieh" },
  averageRating: 4.25,
  reviewCount: 20,
  reviewLabels: [{ name: "Engaging", count: 8 }],
  courseCount: 2,
};

describe("courseDescription", () => {
  it("names the course and carries its figures when reviews exist", () => {
    expect(courseDescription(baseCourse)).toBe(
      "Digital Business - Technologies and Transformation (IS215): " +
        "9 student reviews with a 4.11/5 average rating across 6 professors." +
        " Most-cited label: Engaging.",
    );
  });

  it("omits the label note when the top label has zero count", () => {
    const description = courseDescription({
      ...baseCourse,
      reviewLabels: [{ name: "Engaging", count: 0 }],
    });
    expect(description).not.toContain("Most-cited label");
    expect(description).toContain("9 student reviews");
  });

  it("never fabricates a rating for a zero-review course", () => {
    const description = courseDescription({
      ...baseCourse,
      averageRating: 0,
      reviewCount: 0,
      reviewLabels: [],
    });
    expect(description).toBe(
      "Digital Business - Technologies and Transformation (IS215): " +
        "no student reviews yet; taught by 6 professors.",
    );
  });

  it("uses the singular for one professor", () => {
    const description = courseDescription({
      ...baseCourse,
      reviewCount: 0,
      reviewLabels: [],
      professorCount: 1,
    });
    expect(description).toContain("taught by 1 professor.");
  });
});

describe("professorDescription", () => {
  it("names the professor and carries their figures", () => {
    expect(professorDescription(baseProfessor)).toBe(
      "OUH Eng Lieh: 20 student reviews with a 4.25/5 average rating " +
        "across 2 courses. Most-cited label: Engaging.",
    );
  });

  it("never fabricates a rating for a zero-review professor", () => {
    const description = professorDescription({
      ...baseProfessor,
      averageRating: 0,
      reviewCount: 0,
      reviewLabels: [],
      courseCount: 1,
    });
    expect(description).toBe(
      "OUH Eng Lieh: no student reviews yet; teaches 1 course.",
    );
  });
});
