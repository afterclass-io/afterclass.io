import { describe, expect, it } from "vitest";

import {
  aggregateCandidates,
  computeSeniorTargets,
  type PlanEntry,
  type PlanSenior,
  type PlanSeniorTarget,
} from "./plan-semester";
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

/** AY2024/25 + AY2025/26 with real AcadTerm term codes (no "T" prefix). */
const TERMS: SyncTermRow[] = [
  term("2024-T1", 2024, "1", 2024, 7), // Aug 2024
  term("2024-T2", 2024, "2", 2024, 10), // Nov 2024
  term("2024-T3A", 2024, "3A", 2025, 0), // Jan 2025
  term("2024-T3B", 2024, "3B", 2025, 2), // Mar 2025
  term("2025-T1", 2025, "1", 2025, 7), // Aug 2025
  term("2025-T2", 2025, "2", 2025, 10), // Nov 2025
  term("2025-T3A", 2025, "3A", 2026, 0), // Jan 2026
  term("2025-T3B", 2025, "3B", 2026, 2), // Mar 2026
];

function senior(
  id: string,
  matricTermId: string | null,
  voteCount: number,
): PlanSenior {
  return {
    id,
    name: `${id} roadmap`,
    ownerUsername: id,
    matricTermId,
    facultyId: 1,
    voteCount,
  };
}

function entry(
  roadmapId: string,
  courseId: string,
  courseCode: string,
  courseName: string,
  roadmapName: string,
  ownerUsername: string,
): PlanEntry {
  return {
    roadmapId,
    roadmapName,
    ownerUsername,
    courseId,
    courseCode,
    courseName,
    creditUnits: 1,
  };
}

// ---------------------------------------------------------------------------
// computeSeniorTargets
// ---------------------------------------------------------------------------

describe("computeSeniorTargets", () => {
  it("maps a senior matriculating in AY2024/25 T1 to the position of a later target term", () => {
    const targets = computeSeniorTargets(
      [senior("s1", "2024-T1", 5)],
      TERMS,
      "2025-T3A",
    );
    // 2024-T1..2025-T3A -> 7 terms -> year 2, term T3A (same as buildProgressSyncPlan's last target)
    expect(targets.get("s1")).toEqual({ yearNumber: 2, term: "T3A" });
  });

  it("returns null for a senior without a matricTermId", () => {
    const targets = computeSeniorTargets(
      [senior("s1", null, 5)],
      TERMS,
      "2025-T3A",
    );
    expect(targets.get("s1")).toBeNull();
  });

  it("returns null when the target term is before the senior's matriculation", () => {
    const targets = computeSeniorTargets(
      [senior("s1", "2025-T1", 5)],
      TERMS,
      "2024-T2",
    );
    expect(targets.get("s1")).toBeNull();
  });

  it("computes an independent target for each senior", () => {
    const targets = computeSeniorTargets(
      [senior("s1", "2024-T1", 5), senior("s2", "2024-T2", 3)],
      TERMS,
      "2025-T1",
    );
    // s1: 2024-T1..2025-T1 -> { yearNumber: 2, term: "T1" }
    expect(targets.get("s1")).toEqual({ yearNumber: 2, term: "T1" });
    // s2: 2024-T2..2025-T1 -> { yearNumber: 2, term: "T1" }
    expect(targets.get("s2")).toEqual({ yearNumber: 2, term: "T1" });
  });
});

// ---------------------------------------------------------------------------
// aggregateCandidates
// ---------------------------------------------------------------------------

describe("aggregateCandidates", () => {
  it("counts frequency across seniors, weights by votes, and picks the top senior roadmap", () => {
    const targetByRoadmap = new Map<string, PlanSeniorTarget>([
      ["srA", { yearNumber: 2, term: "T3A" }],
      ["srB", { yearNumber: 2, term: "T3A" }],
    ]);
    const seniorVotes = new Map([
      ["srA", 5],
      ["srB", 3],
    ]);
    const candidates = aggregateCandidates(
      [
        entry("srA", "c1", "ACCT101", "Financial Accounting", "Alice's Plan", "alice"),
        entry("srB", "c1", "ACCT101", "Financial Accounting", "Bob's Plan", "bob"),
      ],
      targetByRoadmap,
      seniorVotes,
      new Set<string>(),
    );
    expect(candidates).toEqual([
      {
        courseId: "c1",
        code: "ACCT101",
        name: "Financial Accounting",
        creditUnits: 1,
        seniorCount: 2,
        topSeniorRoadmap: { name: "Alice's Plan", ownerUsername: "alice" },
      },
    ]);
  });

  it("excludes existingCourseIds and sorts by weighted frequency desc", () => {
    const targetByRoadmap = new Map<string, PlanSeniorTarget>([
      ["srA", { yearNumber: 2, term: "T3A" }],
      ["srB", { yearNumber: 2, term: "T3A" }],
    ]);
    const seniorVotes = new Map([
      ["srA", 10],
      ["srB", 5],
    ]);
    const candidates = aggregateCandidates(
      [
        entry("srA", "c1", "ACCT101", "Financial Accounting", "Alice's Plan", "alice"),
        entry("srB", "c2", "STAT101", "Statistical Thinking", "Bob's Plan", "bob"),
        entry("srA", "c2", "STAT101", "Statistical Thinking", "Alice's Plan", "alice"),
      ],
      targetByRoadmap,
      seniorVotes,
      new Set(["c1"]), // the user already took c1 -> excluded
    );
    expect(candidates.map((c) => c.courseId)).toEqual(["c2"]);
    expect(candidates[0]).toMatchObject({
      seniorCount: 2,
      topSeniorRoadmap: { name: "Alice's Plan", ownerUsername: "alice" },
    });
  });

  it("skips entries from seniors without a computable target and respects topK", () => {
    const targetByRoadmap = new Map<string, PlanSeniorTarget>([
      ["srA", { yearNumber: 2, term: "T3A" }],
      ["srB", null], // no matricTermId / out of range - never counts
    ]);
    const seniorVotes = new Map([
      ["srA", 1],
      ["srB", 100], // huge vote count must NOT leak in
    ]);
    const candidates = aggregateCandidates(
      [
        entry("srA", "c1", "ACCT101", "Financial Accounting", "Alice's Plan", "alice"),
        entry("srB", "c2", "STAT101", "Statistical Thinking", "Bob's Plan", "bob"),
      ],
      targetByRoadmap,
      seniorVotes,
      new Set<string>(),
    );
    expect(candidates.map((c) => c.courseId)).toEqual(["c1"]);

    const manyTargets = new Map<string, PlanSeniorTarget>([["srA", { yearNumber: 2, term: "T3A" }]]);
    const manyEntries = Array.from({ length: 5 }, (_, i) =>
      entry("srA", `c${i + 1}`, `CODE${i + 1}`, `Course ${i + 1}`, "Alice's Plan", "alice"),
    );
    const truncated = aggregateCandidates(manyEntries, manyTargets, seniorVotes, new Set<string>(), 2);
    expect(truncated).toHaveLength(2);
  });

  it("returns an empty list when every entry is already taken", () => {
    const targetByRoadmap = new Map<string, PlanSeniorTarget>([
      ["srA", { yearNumber: 2, term: "T3A" }],
    ]);
    const seniorVotes = new Map([["srA", 5]]);
    const candidates = aggregateCandidates(
      [entry("srA", "c1", "ACCT101", "Financial Accounting", "Alice's Plan", "alice")],
      targetByRoadmap,
      seniorVotes,
      new Set(["c1"]),
    );
    expect(candidates).toEqual([]);
  });
});
