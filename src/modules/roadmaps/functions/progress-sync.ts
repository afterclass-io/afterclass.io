/**
 * Pure helpers for matriculation-based progress sync.
 *
 * The active roadmap declares a matriculation acad term (the user's Y1T1).
 * Each chronological acad term from matriculation onwards maps back to a
 * roadmap (yearNumber, term) pair, so courses from the user's actual
 * timetables can be synced into the matching roadmap term.
 *
 * AcadTerm rows store term codes without the "T" prefix ("1", "2", "3A",
 * "3B"); roadmaps use "T1", "T2", "T3A", "T3B". The reverse mapping here
 * normalizes acad codes into roadmap codes (a legacy single "3" acad term
 * resolves to T3A) — the forward mapping lives in `term-mapping.ts`.
 *
 * All functions are pure — no side effects, no dependencies beyond stdlib.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal AcadTerm row shape needed for the sync plan. */
export type SyncTermRow = {
  id: string;
  acadYearStart: number;
  term: string;
  startDt: Date;
};

/** A roadmap term that should be filled from one acad term's timetable. */
export type ProgressSyncTarget = {
  acadTermId: string;
  yearNumber: number;
  /** Roadmap term code: T1 | T2 | T3A */
  term: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map an acad term code back to a roadmap term code.
 *
 * AcadTerm rows store `term` without the "T" prefix ("1", "2", "3A", "3B");
 * roadmaps use "T1", "T2", "T3A", "T3B". Codes are normalized to the
 * roadmap form; already-prefixed codes ("T1", "T2", "T3") are tolerated.
 *
 * A single "T3" acad term covers both roadmap T3A and T3B; synced courses
 * land in T3A. Distinct "3A"/"3B" acad terms map 1:1 onto T3A/T3B.
 */
export function roadmapTermForAcadTerm(acadTermCode: string): string {
  const code = acadTermCode.startsWith("T") ? acadTermCode : `T${acadTermCode}`;
  if (code === "T3") return "T3A";
  return code;
}

/**
 * Build the list of (acadTermId → roadmap year/term) targets to sync:
 * every acad term from the matriculation term up to and including the
 * current term, in chronological order.
 *
 * `yearNumber` is derived from the acad-year difference, so gaps in the
 * term sequence (e.g. a missing T3) cannot shift later years.
 *
 * Returns an empty list when either endpoint is unknown.
 */
export function buildProgressSyncPlan(
  terms: SyncTermRow[],
  matricTermId: string,
  currentTermId: string,
): ProgressSyncTarget[] {
  const matric = terms.find((t) => t.id === matricTermId);
  const current = terms.find((t) => t.id === currentTermId);
  if (!matric || !current) return [];

  return terms
    .filter(
      (t) =>
        t.startDt.getTime() >= matric.startDt.getTime() &&
        t.startDt.getTime() <= current.startDt.getTime(),
    )
    .sort((a, b) => a.startDt.getTime() - b.startDt.getTime())
    .map((t) => {
      const computed = t.acadYearStart - matric.acadYearStart + 1;
      return {
        acadTermId: t.id,
        yearNumber: Math.min(8, Math.max(1, computed)),
        term: roadmapTermForAcadTerm(t.term),
      };
    })
    .filter((t) => t.yearNumber >= 1);
}

/**
 * Merge synced courses into an existing course set, add-only.
 *
 * Returns the courseIds from `candidates` that are not already present in
 * `existingCourseIds` (and not duplicated within `candidates` itself).
 */
export function pickNewCourseIds(
  existingCourseIds: ReadonlySet<string>,
  candidates: string[],
): string[] {
  const seen = new Set(existingCourseIds);
  const fresh: string[] = [];
  for (const courseId of candidates) {
    if (seen.has(courseId)) continue;
    seen.add(courseId);
    fresh.push(courseId);
  }
  return fresh;
}
