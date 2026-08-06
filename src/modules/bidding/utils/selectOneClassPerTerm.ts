/**
 * One-class-per-term selection with timing-based tiebreaking.
 *
 * When a professor taught multiple sections of the same course in a single
 * academic term, this utility picks the section whose schedule is closest to
 * a reference class. If the professor didn't teach the course in a term, that
 * term is simply absent (no forced gap-fill).
 *
 * Algorithm: Best-Match Timing Distance
 * ─────────────────────────────────────
 * For each candidate class, compute an average match distance against the
 * reference class's timings:
 *
 *   For each reference timing (rDay, rStart):
 *     For each candidate timing (cDay, cStart):
 *       dayDistance = circular day-of-week distance (0–2)
 *       timeDistance = |cStart - rStart| in minutes
 *       score = dayDistance * 720 + timeDistance
 *       bestMatch = min(bestMatch, score)
 *     totalDistance += bestMatch
 *   candidate.score = totalDistance / |referenceTimings|
 *
 * Day penalty = 720 minutes (12 hours) — same-day comparisons always beat
 * different-day comparisons.
 *
 * Select candidate with lowest score. Ties broken by section label proximity
 * to the reference section.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

interface Timing {
  dayOfWeek: string | null;
  startTime: string;
}

/** Minimal contract a bid result must satisfy for timing-based selection. */
interface SelectableBidResult {
  bidWindow: {
    acadTermId: string;
    round: string;
    window: number;
  };
  class: {
    id: string;
    section: string;
    classTimings: Timing[];
  };
}

// ─── Day-of-week helpers ─────────────────────────────────────────────────────

const DAY_ORDER: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
};

/**
 * Circular distance between two days on a 5-day (Mon–Fri) week.
 * @returns 0–2 (0 = same day, 1 = adjacent, 2 = two days apart)
 */
function dayDistance(a: string, b: string): number {
  const ai = DAY_ORDER[a] ?? -1;
  const bi = DAY_ORDER[b] ?? -1;
  if (ai === -1 || bi === -1) return 2; // unknown day → maximum penalty
  return Math.abs(ai - bi); // linear: Mon(0)→Fri(4) = 4, not adjacent
}

/** Parse "HH:MM" or "HH:MM:SS" to minutes since midnight. */
function minutesSinceMidnight(time: string): number {
  const parts = time.split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  return h * 60 + m;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

/**
 * Compute a similarity score for a candidate class against reference timings.
 * Lower score = more similar schedule.
 *
 * @returns average match distance across all reference timings, or Infinity if
 *          the candidate has no timings to compare
 */
function scoreTimingMatch(
  candidate: { classTimings: Timing[] },
  referenceTimings: Timing[],
): number {
  if (referenceTimings.length === 0) return 0; // no reference → all equal
  const candTimings = candidate.classTimings;

  // No candidate timings → worst possible match
  if (candTimings.length === 0) return Infinity;

  let totalDistance = 0;

  let matchedRefs = 0;

  for (const ref of referenceTimings) {
    if (!ref.dayOfWeek) continue;
    matchedRefs++;
    const refMin = minutesSinceMidnight(ref.startTime);
    let bestMatch = Infinity;

    for (const cand of candTimings) {
      if (!cand.dayOfWeek) continue;
      const dayDist = dayDistance(ref.dayOfWeek, cand.dayOfWeek);
      const timeDist = Math.abs(minutesSinceMidnight(cand.startTime) - refMin);
      // Day penalty = 12 hours → same-day always beats different-day
      const score = dayDist * 720 + timeDist;
      if (score < bestMatch) bestMatch = score;
    }

    // If no candidate timing matched any day for this reference slot, apply
    // maximum penalty so this reference slot doesn't skew the average
    if (bestMatch === Infinity) {
      bestMatch = 2 * 720 + 720; // max day distance + 12 hours
    }

    totalDistance += bestMatch;
  }

  // Divide by the count of reference timings that actually had a dayOfWeek,
  // not the full length, to avoid artificially lowering scores when some
  // reference timings have null days.
  if (matchedRefs === 0) return 0;
  return totalDistance / matchedRefs;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Group bid results by academic term and select at most one class per term.
 *
 * When a professor taught multiple sections of the same course in one term,
 * the section with the closest timing to `referenceTimings` is selected.
 * Terms where the professor didn't teach the course are absent from the output.
 *
 * @param results   All bid results for a (course, professor) pair, across all terms
 * @param referenceTimings  The schedule of the class the user is currently viewing
 * @param referenceSection  The section label of the current class (for tiebreaking)
 * @returns Filtered results containing only the selected class per term
 */
export function selectOneClassPerTerm<T extends SelectableBidResult>(
  results: T[],
  referenceTimings: Timing[],
  referenceSection?: string,
): T[] {
  // 1. Group results by academic term
  const byTerm = new Map<string, T[]>();
  for (const r of results) {
    const termId = r.bidWindow.acadTermId;
    if (!byTerm.has(termId)) byTerm.set(termId, []);
    byTerm.get(termId)!.push(r);
  }

  const selected: T[] = [];

  for (const [, termResults] of byTerm) {
    // 2. Get unique classes in this term (a class may have results in
    //    multiple bid windows — keep all windows for the chosen class)
    const classMap = new Map<string, T["class"]>();
    for (const r of termResults) {
      if (!classMap.has(r.class.id)) {
        classMap.set(r.class.id, r.class);
      }
    }
    const uniqueClasses = Array.from(classMap.values());

    let chosenClassId: string;

    if (uniqueClasses.length === 1) {
      // Only one class this term — use it
      chosenClassId = uniqueClasses[0]!.id;
    } else {
      // Multiple classes — pick the one with closest timing
      const scored = uniqueClasses.map((c) => ({
        id: c.id,
        section: c.section,
        score: scoreTimingMatch(c, referenceTimings),
      }));

      // Sort by score (lower = better), then by section proximity to reference
      scored.sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        // Tiebreak: prefer section label closer to reference section
        if (referenceSection) {
          const aDist = Math.abs(
            parseInt(a.section.replace(/\D/g, "")) -
              parseInt(referenceSection.replace(/\D/g, "")),
          );
          const bDist = Math.abs(
            parseInt(b.section.replace(/\D/g, "")) -
              parseInt(referenceSection.replace(/\D/g, "")),
          );
          if (!isNaN(aDist) && !isNaN(bDist) && aDist !== bDist)
            return aDist - bDist;
        }
        return a.section.localeCompare(b.section);
      });

      chosenClassId = scored[0]!.id;
    }

    // Keep all bid window results for the chosen class
    for (const r of termResults) {
      if (r.class.id === chosenClassId) {
        selected.push(r);
      }
    }
  }

  return selected;
}
