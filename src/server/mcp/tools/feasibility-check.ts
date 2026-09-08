/**
 * Pure feasibility engine shared by check-roadmap-feasibility
 * (read/feasibility.ts) and upsert-roadmap-entry (write/upsert-roadmap-entry.ts).
 *
 * Deterministic, no I/O: every check operates on plain entry/lookup params,
 * so both tools reuse the same logic with different data-access wrappers.
 * (Structured prereq parsing is a separate phase-2 effort; see
 * docs/specs/phase-2-prereq-grammar.md.)
 */

import { z } from "zod";

/** Roadmap term codes in chronological order within a year. */
export const TERM_ORDER: Record<string, number> = {
  T1: 0,
  T2: 1,
  T3A: 2,
  T3B: 3,
};

/** Shared roadmap term schema (M10: single source, not per-file enums). */
export const roadmapTermSchema = z.enum(["T1", "T2", "T3A", "T3B"]);

/** Sort roadmap entries by (yearNumber, term); stable within a term. */
export function sortByTerm<T extends { yearNumber: number; term: string }>(
  entries: T[],
): T[] {
  return [...entries].sort(
    (a, b) =>
      a.yearNumber - b.yearNumber ||
      (TERM_ORDER[a.term] ?? 99) - (TERM_ORDER[b.term] ?? 99),
  );
}

/**
 * Best-effort extraction of SMU course codes from a raw SIS enrolment
 * requirements string. SIS strings are free text, e.g.
 *   "Pre-Requisite: EITHER COR-IS1702 OR Introduction to Programming"
 *   "Mutually Exclusive: EITHER ACCT102 ... OR ACCT104/112 Management Accounting"
 * This pulls out tokens shaped like course codes:
 *   - `IS215`, `ACCT102`, `MGMT214`            (letters + 3-4 digits)
 *   - `COR-IS1702`                              (faculty prefix + hyphen)
 *   - `LAW 205`                                 (space between letters and digits)
 *   - `ACCT104/112`                             (alternative-code suffix -> ACCT104 OR ACCT112)
 * Course names without codes ("Introduction to Programming") yield nothing.
 *
 * Only the prerequisite clause is scanned: everything from the first
 * "Mutually Exclusive"/"mutually exclusive" marker onward is ignored, because
 * mutual-exclusion clauses carry alternative/exclusion codes (e.g. ACCT102 in
 * "Mutually Exclusive: EITHER ACCT102 OR ACCT104/112 ...") that are NOT
 * prerequisites and would otherwise produce false PREREQ_MISSING reports.
 */
export function extractPrereqCodes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const prereqClause = raw.split(/\bmutually\s+exclusive\b/i)[0] ?? "";
  const matches =
    prereqClause.match(
      /\b[A-Z]{2,4}(?:-[A-Z]{2,4})?\s?\d{3,4}(?:\/\d{3,4})?\b/g,
    ) ?? [];
  const codes = new Set<string>();
  for (const match of matches) {
    const normalized = match.replace(/\s/g, "").toUpperCase();
    const [base, alt] = normalized.split("/");
    if (base) codes.add(base);
    if (alt) codes.add(alt);
  }
  return [...codes];
}

/** "HH:MM" (24h) -> minutes since midnight; NaN for anything else. */
export function toMinutes(time: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return Number.NaN;
  return Number(m[1]!) * 60 + Number(m[2]!);
}

/** Overlap on two [start, end) intervals; unknown/malformed times -> no overlap. */
export function intervalsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const [as, ae, bs, be] = [
    toMinutes(aStart),
    toMinutes(aEnd),
    toMinutes(bStart),
    toMinutes(bEnd),
  ];
  if ([as, ae, bs, be].some((v) => Number.isNaN(v))) return false;
  return as < be && bs < ae;
}

/** Normalize an exam date (DateTime | ISO string) to a YYYY-MM-DD key. */
export function dateKey(date: unknown): string {
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  if (typeof date === "string") return date.slice(0, 10);
  return String(date);
}

export type FeasibilityIssueType =
  "PREREQ_MISSING" | "EXAM_CLASH" | "TERM_DUPLICATE";

export type FeasibilityIssue = {
  type: FeasibilityIssueType;
  courseCode: string;
  courseName: string;
  detail: string;
};

export type FeasibilityEntry = {
  course: { code: string; name: string };
  yearNumber: number;
  term: string;
};

/**
 * Dedup-aware issue collector. PREREQ_MISSING keys on (type, courseCode) so a
 * course planned in several terms with the same missing prereq is reported
 * once; TERM_DUPLICATE passes an extra (yearNumber, term) key so the same
 * course duplicated in two different terms yields two issues (one per term);
 * EXAM_CLASH uses its own pair key below (each distinct overlap is separate).
 */
export function createIssueCollector(): {
  issues: FeasibilityIssue[];
  flagCourse: (issue: FeasibilityIssue, dedupKey?: string) => void;
} {
  const issues: FeasibilityIssue[] = [];
  const flagged = new Set<string>();
  const flagCourse = (issue: FeasibilityIssue, dedupKey?: string) => {
    const key = dedupKey
      ? `${issue.type}|${issue.courseCode}|${dedupKey}`
      : `${issue.type}|${issue.courseCode}`;
    if (flagged.has(key)) return;
    flagged.add(key);
    issues.push(issue);
  };
  return { issues, flagCourse };
}

/** TERM_DUPLICATE: same course twice in one (yearNumber, term). */
export function checkTermDuplicates(
  entries: FeasibilityEntry[],
  flagCourse: (issue: FeasibilityIssue, dedupKey?: string) => void,
): void {
  const byTerm = new Map<string, FeasibilityEntry[]>();
  for (const e of entries) {
    const key = `${e.yearNumber}|${e.term}`;
    const list = byTerm.get(key) ?? [];
    list.push(e);
    byTerm.set(key, list);
  }
  for (const [key, list] of byTerm) {
    const [year, term] = key.split("|");
    const counts = new Map<string, number>();
    for (const e of list)
      counts.set(e.course.code, (counts.get(e.course.code) ?? 0) + 1);
    for (const [code, count] of counts) {
      if (count > 1) {
        flagCourse(
          {
            type: "TERM_DUPLICATE",
            courseCode: code,
            courseName:
              list.find((e) => e.course.code === code)?.course.name ?? code,
            detail: `Course ${code} appears ${count} times in Year ${year} ${term}.`,
          },
          `${year}|${term}`,
        );
      }
    }
  }
}

/**
 * PREREQ_MISSING: prerequisite not in an earlier term. "Taken" = course codes
 * planned in strictly earlier (year, term) slots. `getRequirements` is the
 * caller's course-lookup (thin wrapper over `courses.getByCourseCode`);
 * extractPrereqCodes already ignores the "Mutually Exclusive" clause and the
 * course's own code is additionally excluded as a safety net.
 */
export async function checkPrereqs(
  entries: FeasibilityEntry[],
  getRequirements: (code: string) => Promise<string | null>,
  flagCourse: (issue: FeasibilityIssue, dedupKey?: string) => void,
): Promise<void> {
  const courseDetail = new Map<string, string | null>();
  const ordered = sortByTerm(entries);
  const groups = new Map<string, FeasibilityEntry[]>();
  for (const e of ordered) {
    const key = `${e.yearNumber}|${e.term}`;
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }
  const taken = new Set<string>();
  for (const list of groups.values()) {
    for (const e of list) {
      const code = e.course.code;
      if (!courseDetail.has(code)) {
        courseDetail.set(code, await getRequirements(code));
      }
      const raw = courseDetail.get(code) ?? null;
      // extractPrereqCodes already ignores the "Mutually Exclusive" clause;
      // additionally exclude the course's own code as a safety net.
      const required = extractPrereqCodes(raw).filter((c) => c !== code);
      const missing = required.filter((c) => !taken.has(c));
      if (missing.length > 0) {
        flagCourse({
          type: "PREREQ_MISSING",
          courseCode: code,
          courseName: e.course.name,
          detail: `Course ${code} requires ${missing.join(", ")} ${
            missing.length === 1 ? "which isn't" : "which aren't"
          } planned in an earlier term. Raw requirement: "${raw ?? ""}"`,
        });
      }
    }
    for (const e of list) taken.add(e.course.code);
  }
}

export type ExamSlot = {
  courseCode: string;
  courseName: string;
  date: string;
  startTime: string;
  endTime: string;
};

/**
 * EXAM_CLASH: overlapping exams on the same date for different courses.
 * Same course = shared/combined exam, not a clash.
 */
export function checkExamClashes(
  exams: ExamSlot[],
  push: (issue: FeasibilityIssue) => void,
): void {
  const seenPairs = new Set<string>();
  for (let i = 0; i < exams.length; i++) {
    for (let j = i + 1; j < exams.length; j++) {
      const a = exams[i]!;
      const b = exams[j]!;
      // Same course = shared/combined exam, not a clash.
      if (a.courseCode === b.courseCode) continue;
      if (
        a.date === b.date &&
        intervalsOverlap(a.startTime, a.endTime, b.startTime, b.endTime)
      ) {
        const pairKey =
          [a.courseCode, b.courseCode].sort().join("|") + `|${a.date}`;
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);
        push({
          type: "EXAM_CLASH",
          courseCode: a.courseCode,
          courseName: a.courseName,
          detail: `Exams for ${a.courseCode} and ${b.courseCode} overlap on ${a.date} (${a.startTime}-${a.endTime} vs ${b.startTime}-${b.endTime}).`,
        });
      }
    }
  }
}
