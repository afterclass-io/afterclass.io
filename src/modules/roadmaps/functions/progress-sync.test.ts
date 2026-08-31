import { describe, expect, it } from "vitest";

import { buildProgressSyncPlan, pickNewCourseIds, roadmapTermForAcadTerm } from "./progress-sync";
import type { SyncTermRow } from "./progress-sync";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function term(
  id: string,
  acadYearStart: number,
  code: string,
  startYear: number,
  startMonth: number,
): SyncTermRow {
  return {
    id,
    acadYearStart,
    term: code,
    startDt: new Date(Date.UTC(startYear, startMonth, 1)),
  };
}

/** AY2026/27 + AY2027/28 with real AcadTerm term codes (no "T" prefix). */
const TERMS: SyncTermRow[] = [
  term("2026-T1", 2026, "1", 2026, 7), // Aug 2026
  term("2026-T2", 2026, "2", 2026, 10), // Nov 2026
  term("2026-T3A", 2026, "3A", 2027, 0), // Jan 2027
  term("2026-T3B", 2026, "3B", 2027, 2), // Mar 2027
  term("2027-T1", 2027, "1", 2027, 7), // Aug 2027
  term("2027-T2", 2027, "2", 2027, 10), // Nov 2027
];

// ---------------------------------------------------------------------------
// roadmapTermForAcadTerm
// ---------------------------------------------------------------------------

describe("roadmapTermForAcadTerm", () => {
  it("normalizes raw AcadTerm codes to roadmap term codes", () => {
    expect(roadmapTermForAcadTerm("1")).toBe("T1");
    expect(roadmapTermForAcadTerm("2")).toBe("T2");
    expect(roadmapTermForAcadTerm("3A")).toBe("T3A");
    expect(roadmapTermForAcadTerm("3B")).toBe("T3B");
  });

  it("maps a legacy single acad T3 to roadmap T3A", () => {
    expect(roadmapTermForAcadTerm("T3")).toBe("T3A");
    expect(roadmapTermForAcadTerm("3")).toBe("T3A");
  });

  it("tolerates already-prefixed codes", () => {
    expect(roadmapTermForAcadTerm("T1")).toBe("T1");
    expect(roadmapTermForAcadTerm("T2")).toBe("T2");
    expect(roadmapTermForAcadTerm("T3A")).toBe("T3A");
    expect(roadmapTermForAcadTerm("T3B")).toBe("T3B");
  });
});

// ---------------------------------------------------------------------------
// buildProgressSyncPlan
// ---------------------------------------------------------------------------

describe("buildProgressSyncPlan", () => {
  it("maps terms from matriculation up to the current term", () => {
    const plan = buildProgressSyncPlan(TERMS, "2026-T1", "2026-T3A");
    expect(plan).toEqual([
      { acadTermId: "2026-T1", yearNumber: 1, term: "T1" },
      { acadTermId: "2026-T2", yearNumber: 1, term: "T2" },
      { acadTermId: "2026-T3A", yearNumber: 1, term: "T3A" },
    ]);
  });

  it("derives the year number from the acad year difference", () => {
    const plan = buildProgressSyncPlan(TERMS, "2026-T1", "2027-T2");
    expect(plan.map((t) => [t.acadTermId, t.yearNumber, t.term])).toEqual([
      ["2026-T1", 1, "T1"],
      ["2026-T2", 1, "T2"],
      ["2026-T3A", 1, "T3A"],
      ["2026-T3B", 1, "T3B"],
      ["2027-T1", 2, "T1"],
      ["2027-T2", 2, "T2"],
    ]);
  });

  it("supports matriculating in a later term of the acad year", () => {
    const plan = buildProgressSyncPlan(TERMS, "2026-T2", "2027-T1");
    expect(plan.map((t) => [t.acadTermId, t.yearNumber, t.term])).toEqual([
      ["2026-T2", 1, "T2"],
      ["2026-T3A", 1, "T3A"],
      ["2026-T3B", 1, "T3B"],
      ["2027-T1", 2, "T1"],
    ]);
  });

  it("excludes terms after the current term", () => {
    const plan = buildProgressSyncPlan(TERMS, "2026-T1", "2027-T1");
    expect(plan.find((t) => t.acadTermId === "2027-T2")).toBeUndefined();
  });

  it("returns an empty plan for unknown endpoints", () => {
    expect(buildProgressSyncPlan(TERMS, "nope", "2026-T1")).toEqual([]);
    expect(buildProgressSyncPlan(TERMS, "2026-T1", "nope")).toEqual([]);
    expect(buildProgressSyncPlan([], "2026-T1", "2026-T1")).toEqual([]);
  });

  it("is independent of input row ordering", () => {
    const shuffled = [...TERMS].toReversed();
    expect(buildProgressSyncPlan(shuffled, "2026-T1", "2026-T2")).toEqual(
      buildProgressSyncPlan(TERMS, "2026-T1", "2026-T2"),
    );
  });

  it("clamps yearNumber to at most 8", () => {
    // Build a plan whose earliest matric term implies yearNumber > 8 for the
    // oldest terms; assert every target has 1 <= yearNumber <= 8.
    const OLD_TERMS: SyncTermRow[] = [
      term("2018-T1", 2018, "1", 2018, 7),
      term("2018-T2", 2018, "2", 2018, 10),
      term("2019-T1", 2019, "1", 2019, 7),
      term("2026-T1", 2026, "1", 2026, 7),
      term("2027-T1", 2027, "1", 2027, 7),
      term("2028-T1", 2028, "1", 2028, 7),
    ];
    // Matric 2018-T1, current 2028-T1 → yearNumber would be 2028-2018+1 = 11
    const plan = buildProgressSyncPlan(OLD_TERMS, "2018-T1", "2028-T1");
    for (const target of plan) {
      expect(target.yearNumber).toBeGreaterThanOrEqual(1);
      expect(target.yearNumber).toBeLessThanOrEqual(8);
    }
    // The oldest term should be clamped to 8, not 11.
    const last = plan[plan.length - 1];
    expect(last!.yearNumber).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// pickNewCourseIds
// ---------------------------------------------------------------------------

describe("pickNewCourseIds", () => {
  it("keeps only courses not already on the roadmap", () => {
    expect(pickNewCourseIds(new Set(["a", "b"]), ["b", "c", "d"])).toEqual(["c", "d"]);
  });

  it("dedupes candidates within a single sync run", () => {
    expect(pickNewCourseIds(new Set(), ["a", "a", "b"])).toEqual(["a", "b"]);
  });

  it("returns nothing when everything already exists", () => {
    expect(pickNewCourseIds(new Set(["a"]), ["a"])).toEqual([]);
  });
});
