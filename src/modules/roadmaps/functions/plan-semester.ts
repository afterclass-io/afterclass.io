/**
 * Pure helpers for the plan-semester workflow.
 *
 * plan-semester answers: "given my progression, what should I take next term,
 * inspired by seniors' public roadmaps?" All functions are pure - the tRPC
 * procedure owns DB access; everything here is passed in and plain data comes
 * out (mirrors the style of `progress-sync.ts`).
 */
import { buildProgressSyncPlan, type SyncTermRow } from "./progress-sync";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A senior's public roadmap as seen by the plan-semester procedure. */
export type PlanSenior = {
  id: string;
  name: string;
  ownerUsername: string;
  matricTermId: string | null;
  facultyId: number | null;
  /** Upvotes (weight = 1), same semantics as roadmaps.listPublic. */
  voteCount: number;
};

/** A roadmap (yearNumber, term) position, e.g. `{ yearNumber: 2, term: "T3A" }`. */
export type PlanSeniorTarget = { yearNumber: number; term: string } | null;

/** One roadmap course entry, with the owning roadmap denormalized onto it. */
export type PlanEntry = {
  roadmapId: string;
  roadmapName: string;
  ownerUsername: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  creditUnits: number;
};

/** A ranked candidate course for the user's next term. */
export type CandidateCourse = {
  courseId: string;
  code: string;
  name: string;
  creditUnits: number;
  seniorCount: number;
  topSeniorRoadmap: { name: string; ownerUsername: string };
};

// ---------------------------------------------------------------------------
// computeSeniorTargets
// ---------------------------------------------------------------------------

/**
 * For each senior, compute the (yearNumber, term) they were at during the
 * target calendar term, derived from their matriculation term via
 * `buildProgressSyncPlan` (same position a user with that matric term would
 * be at during the target term).
 *
 * Seniors without a `matricTermId`, or whose target term predates their
 * matriculation, map to `null` and are excluded from aggregation.
 */
export function computeSeniorTargets(
  seniors: PlanSenior[],
  terms: SyncTermRow[],
  targetTermId: string,
): Map<string, PlanSeniorTarget> {
  const out = new Map<string, PlanSeniorTarget>();
  for (const senior of seniors) {
    if (!senior.matricTermId) {
      out.set(senior.id, null);
      continue;
    }
    const plan = buildProgressSyncPlan(terms, senior.matricTermId, targetTermId);
    const target = plan.length > 0 ? plan[plan.length - 1]! : null;
    out.set(
      senior.id,
      target ? { yearNumber: target.yearNumber, term: target.term } : null,
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// aggregateCandidates
// ---------------------------------------------------------------------------

type CourseAgg = {
  courseId: string;
  code: string;
  name: string;
  creditUnits: number;
  seniorCount: number;
  weight: number;
  top: { name: string; ownerUsername: string } | null;
  topWeight: number;
};

/**
 * Aggregate candidate courses across seniors. Each entry is only counted for
 * a senior if that senior's target (yearNumber, term) matches the entry's own
 * (yearNumber, term). Weighted by senior voteCount; courses already in
 * `existingCourseIds` are excluded. Returns the topK candidates sorted by
 * weighted frequency (desc), then seniorCount (desc).
 */
export function aggregateCandidates(
  entries: PlanEntry[],
  targetByRoadmap: Map<string, PlanSeniorTarget>,
  seniorVotes: Map<string, number>,
  existingCourseIds: ReadonlySet<string>,
  topK = 10,
): CandidateCourse[] {
  const byCourse = new Map<string, CourseAgg>();

  for (const entry of entries) {
    if (existingCourseIds.has(entry.courseId)) continue;

    // Skip seniors without a computable target at this calendar term.
    const target = targetByRoadmap.get(entry.roadmapId);
    if (!target) continue;

    const voteCount = seniorVotes.get(entry.roadmapId) ?? 0;
    const agg = byCourse.get(entry.courseId) ?? {
      courseId: entry.courseId,
      code: entry.courseCode,
      name: entry.courseName,
      creditUnits: entry.creditUnits,
      seniorCount: 0,
      weight: 0,
      top: null,
      topWeight: -1,
    };

    agg.seniorCount += 1;
    agg.weight += voteCount;
    if (voteCount > agg.topWeight) {
      agg.top = { name: entry.roadmapName, ownerUsername: entry.ownerUsername };
      agg.topWeight = voteCount;
    }
    byCourse.set(entry.courseId, agg);
  }

  return [...byCourse.values()]
    .sort((a, b) => b.weight - a.weight || b.seniorCount - a.seniorCount)
    .slice(0, topK)
    .map((agg) => ({
      courseId: agg.courseId,
      code: agg.code,
      name: agg.name,
      creditUnits: agg.creditUnits,
      seniorCount: agg.seniorCount,
      topSeniorRoadmap: agg.top ?? { name: "", ownerUsername: "" },
    }));
}
