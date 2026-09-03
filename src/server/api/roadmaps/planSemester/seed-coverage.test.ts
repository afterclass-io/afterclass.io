import { describe, expect, it } from "vitest";

import {
  aggregateCandidates,
  computeSeniorTargets,
  type PlanSenior,
} from "@/modules/roadmaps/functions/plan-semester";
import acadTermsJson from "../../../../../prisma/data/14_acad_terms.json";
import coursesJson from "../../../../../prisma/data/3_courses.json";
import roadmapsJson from "../../../../../prisma/data/25_user_roadmaps.json";
import entriesJson from "../../../../../prisma/data/26_user_roadmap_entries.json";

type AcadTermRow = {
  id: string;
  acadYearStart: number;
  term: string;
  startDt: string;
};

type RoadmapRow = {
  id: string;
  name: string;
  visibility: string;
  facultyId: number | null;
  matricTermId: string | null;
  publishedAt: string | null;
};

type EntryRow = {
  roadmapId: string;
  courseId: string;
  yearNumber: number;
  term: string;
};

/**
 * Seed-fixture guard for Task 3: plan-semester must return non-empty
 * candidates for SCIS (faculty 4) seniors of the AY2023/24 intake.
 *
 * Fails until the append-only seeds land:
 * - AY2023/24 T1..T3B rows in 14_acad_terms.json
 * - PUBLIC faculty-4 roadmaps with matricTermId AY202324T1 in
 *   25_user_roadmaps.json + Y1 entries in 26_user_roadmap_entries.json
 */
describe("plan-semester seed coverage (SCIS intake 2023)", () => {
  it("returns non-empty candidates for faculty 4 at AY202324T1", () => {
    const terms = acadTermsJson as unknown as AcadTermRow[];
    const targetTermId = "AY202324T1";
    expect(terms.some((t) => t.id === targetTermId)).toBe(true);

    const roadmaps = roadmapsJson as unknown as RoadmapRow[];
    const seniors = roadmaps.filter(
      (r) =>
        r.visibility === "PUBLIC" &&
        r.publishedAt !== null &&
        r.facultyId === 4 &&
        r.matricTermId !== null,
    );
    expect(seniors.length).toBeGreaterThan(0);

    const termRows = terms.map((t) => ({
      id: t.id,
      acadYearStart: t.acadYearStart,
      term: t.term,
      startDt: new Date(t.startDt),
    }));
    const planSeniors: PlanSenior[] = seniors.map((s) => ({
      id: s.id,
      name: s.name,
      ownerUsername: "seed",
      matricTermId: s.matricTermId,
      facultyId: s.facultyId,
      voteCount: 0,
    }));
    const targets = computeSeniorTargets(
      planSeniors,
      termRows,
      targetTermId,
    );
    const matched = [...targets.values()].filter(
      (t): t is { yearNumber: number; term: string } => t !== null,
    );
    expect(matched.length).toBeGreaterThan(0);

    const courses = coursesJson as unknown as {
      id: string;
      code: string;
      name: string;
      creditUnits: number;
    }[];
    const courseById = new Map(courses.map((c) => [c.id, c]));
    const roadmapById = new Map(roadmaps.map((r) => [r.id, r]));
    const entries = entriesJson as unknown as EntryRow[];
    const planEntries = entries
      .filter((e) => {
        const target = targets.get(e.roadmapId);
        return (
          target?.yearNumber === e.yearNumber && target?.term === e.term
        );
      })
      .map((e) => {
        const course = courseById.get(e.courseId);
        const roadmap = roadmapById.get(e.roadmapId);
        return {
          roadmapId: e.roadmapId,
          roadmapName: roadmap?.name ?? e.roadmapId,
          ownerUsername: "seed",
          courseId: e.courseId,
          courseCode: course?.code ?? e.courseId,
          courseName: course?.name ?? e.courseId,
          creditUnits: course?.creditUnits ?? 1,
        };
      });
    expect(planEntries.length).toBeGreaterThan(0);

    const candidates = aggregateCandidates(
      planEntries,
      targets,
      new Map(planSeniors.map((s) => [s.id, 0])),
      new Set<string>(),
      10,
    );
    expect(candidates.length).toBeGreaterThan(0);
  });
});
