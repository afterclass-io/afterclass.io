import { describe, expect, it } from "vitest";
import {
  bidAnalytics,
  coursePage,
  exploreLinkFor,
  professorPage,
  roadmapsMinePage,
  searchPage,
  timetablePage,
} from "./page-links";

describe("page-links", () => {
  it("builds course and professor pages verbatim", () => {
    expect(coursePage("COR-IS1702")).toBe("/course/COR-IS1702");
    expect(professorPage("fang-bingxu")).toBe("/professor/fang-bingxu");
  });
  it("encodes the search query", () => {
    expect(searchPage("machine learning")).toBe("/search?q=machine%20learning");
  });
  it("builds bid-analytics links with only present params", () => {
    expect(
      bidAnalytics({ courseCode: "COR-IS1702", section: "G1", classId: "cl1" }),
    ).toBe("/bidding/analytics?course=COR-IS1702&section=G1&classId=cl1");
    expect(bidAnalytics({})).toBeNull();
  });
  it("exploreLinkFor prefers inputs over resolved output", () => {
    expect(
      exploreLinkFor("COR-IS1702", "G1", {
        courseCode: "OTHER",
        section: "G9",
        classId: "cl9",
      }),
    ).toBe("/bidding/analytics?course=COR-IS1702&section=G1");
  });
  it("links timetable and roadmaps-mine views", () => {
    expect(timetablePage()).toBe("/timetable");
    expect(roadmapsMinePage()).toBe("/roadmaps?view=mine");
  });
});
