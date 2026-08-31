/**
 * Pure conflict-detection functions for roadmap entries.
 *
 * Detects three kinds of conflicts:
 * 1. **duplicate** — same course appears twice in the same (yearNumber, term).
 * 2. **exam-clash**  — two courses in the same term have overlapping exam times.
 * 3. **cu-overload** — sum of creditUnits in a term > 5.5.
 *
 * All functions are pure — no side effects, no dependencies beyond stdlib.
 */
import { timeToMinutes } from "@/common/functions/time";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Conflict = {
  kind: "duplicate" | "exam-clash" | "cu-overload";
  /** The term where the conflict was detected */
  term: { yearNumber: number; term: string };
  /** Human-readable description of the conflict */
  message: string;
  /** Course codes involved in the conflict */
  courseCodes: string[];
};

export type Entry = {
  courseId: string;
  courseCode: string;
  courseName: string;
  creditUnits: number;
  /** Course description from the catalog (optional; used by the course dialog) */
  description?: string | null;
  yearNumber: number;
  term: string; // T1 | T2 | T3A | T3B
};

export type ExamTiming = {
  courseId: string;
  date: Date;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a term key string, e.g. "1-T1" */
function termKey(yearNumber: number, term: string): string {
  return `${yearNumber}-${term}`;
}

/**
 * Find the first entry for a given course, if any. Used to block adding a
 * course that already exists elsewhere in the roadmap (a course may only be
 * planned once — the same course cannot appear in another term).
 */
export function findEntryByCourse(entries: Entry[], courseId: string): Entry | undefined {
  return entries.find((e) => e.courseId === courseId);
}

/**
 * Check whether two exam timings overlap.
 * Uses half-open interval [start, end).
 * Overlap exists when: aStart < bEnd AND bStart < aEnd
 */
function examsOverlap(a: ExamTiming, b: ExamTiming): boolean {
  // Exams must be on the same date to clash
  if (a.date.getTime() !== b.date.getTime()) return false;

  const aStart = timeToMinutes(a.startTime);
  const aEnd = timeToMinutes(a.endTime);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = timeToMinutes(b.endTime);

  return aStart < bEnd && bStart < aEnd;
}

/**
 * Format CU total to a readable string, dropping trailing ".0".
 */
function formatCU(total: number): string {
  return total % 1 === 0 ? total.toFixed(0) : total.toFixed(1);
}

// ---------------------------------------------------------------------------
// Core detection
// ---------------------------------------------------------------------------

/**
 * Detect all conflicts in a set of roadmap entries.
 *
 * @param entries            The roadmap entries to check.
 * @param examTimingsByTerm  Optional map of exam timings keyed by "{yearNumber}-{term}".
 *                           When omitted, exam-clash detection is skipped.
 * @returns An array of detected conflicts. Empty if none found.
 */
export function detectConflicts(
  entries: Entry[],
  examTimingsByTerm?: Map<string, ExamTiming[]>,
): Conflict[] {
  const conflicts: Conflict[] = [];

  if (entries.length === 0) return conflicts;

  // Group entries by term key
  const byTerm = new Map<string, Entry[]>();
  for (const entry of entries) {
    const key = termKey(entry.yearNumber, entry.term);
    const group = byTerm.get(key);
    if (group) {
      group.push(entry);
    } else {
      byTerm.set(key, [entry]);
    }
  }

  // Process each term group
  for (const [key, group] of byTerm) {
    const term = group[0]!;

    // ---- 1. Duplicate detection ----
    const seenCourseIds = new Map<string, string>(); // courseId -> courseCode
    for (const entry of group) {
      if (seenCourseIds.has(entry.courseId)) {
        conflicts.push({
          kind: "duplicate",
          term: { yearNumber: term.yearNumber, term: term.term },
          message: `${entry.courseCode} appears twice in Year ${term.yearNumber} ${term.term}`,
          courseCodes: [entry.courseCode],
        });
      } else {
        seenCourseIds.set(entry.courseId, entry.courseCode);
      }
    }

    // ---- 2. CU overload detection ----
    const totalCU = group.reduce((sum, e) => sum + e.creditUnits, 0);
    if (totalCU > 5.5) {
      conflicts.push({
        kind: "cu-overload",
        term: { yearNumber: term.yearNumber, term: term.term },
        message: `Credit overload (${formatCU(totalCU)} CU) in Year ${term.yearNumber} ${term.term}`,
        courseCodes: group.map((e) => e.courseCode),
      });
    }

    // ---- 3. Exam clash detection ----
    if (examTimingsByTerm) {
      const timings = examTimingsByTerm.get(key);
      if (timings && timings.length >= 2) {
        // Only consider courses that are actually in this term's entries
        const courseIdsInTerm = new Set(group.map((e) => e.courseId));
        const relevantTimings = timings.filter((t) => courseIdsInTerm.has(t.courseId));

        // Compare all pairs
        for (let i = 0; i < relevantTimings.length; i++) {
          for (let j = i + 1; j < relevantTimings.length; j++) {
            const a = relevantTimings[i]!;
            const b = relevantTimings[j]!;
            if (examsOverlap(a, b)) {
              const codeA = group.find((e) => e.courseId === a.courseId)?.courseCode ?? a.courseId;
              const codeB = group.find((e) => e.courseId === b.courseId)?.courseCode ?? b.courseId;
              conflicts.push({
                kind: "exam-clash",
                term: { yearNumber: term.yearNumber, term: term.term },
                message: `Exam clash: ${codeA} vs ${codeB} in Year ${term.yearNumber} ${term.term}`,
                courseCodes: [codeA, codeB],
              });
            }
          }
        }
      }
    }
  }

  // ---- 4. Cross-term duplicate detection ----
  // A course may only be planned once: the same course cannot appear in a
  // different (yearNumber, term) than where it already exists.
  const coursePlace = new Map<string, { yearNumber: number; term: string }>();
  for (const entry of entries) {
    const key = termKey(entry.yearNumber, entry.term);
    const existingPlace = coursePlace.get(entry.courseId);
    if (existingPlace) {
      if (termKey(existingPlace.yearNumber, existingPlace.term) !== key) {
        conflicts.push({
          kind: "duplicate",
          term: { yearNumber: entry.yearNumber, term: entry.term },
          message: `${entry.courseCode} also appears in Year ${existingPlace.yearNumber} ${existingPlace.term}`,
          courseCodes: [entry.courseCode],
        });
      }
    } else {
      coursePlace.set(entry.courseId, {
        yearNumber: entry.yearNumber,
        term: entry.term,
      });
    }
  }

  return conflicts;
}
