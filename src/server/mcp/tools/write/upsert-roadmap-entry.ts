import { z } from "zod";

import { buildRoadmapView, roadmapViewToWidgetProps } from "../roadmap-view-shared";
import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const termSchema = z.enum(["T1", "T2", "T3A", "T3B"]);

const upsertRoadmapEntrySchema = z.object({
  roadmapId: z
    .string()
    .optional()
    .describe("Roadmap id from my-roadmaps. Omit to use your active roadmap."),
  courseCode: z.string().min(1).describe("Course code, e.g. COR-IS1702 or ACCT102"),
  yearNumber: z.number().int().min(1).max(8).describe("Year number, 1..8"),
  term: termSchema.describe("Term: T1 | T2 | T3A | T3B"),
  sortOrder: z
    .number()
    .int()
    .min(0)
    .max(99)
    .optional()
    .describe("Optional sort order within the term (0..99); defaults to next slot in that year/term"),
});

export const upsertRoadmapEntryTool: McpTool<typeof upsertRoadmapEntrySchema> = {
  name: "upsert-roadmap-entry",
  description:
    "Add a course to a study roadmap (additive: does NOT wipe other entries). Provide the roadmap id (omit for your active roadmap), a course code (e.g. ACCT102), and the desired placement year + term (e.g. year 3, T1). Returns the full updated roadmap (via roadmap-view) PLUS feasibility info { issues, isFeasible } (PREREQ_MISSING / TERM_DUPLICATE / EXAM_CLASH - same as check-roadmap-feasibility). Replaces save-roadmap-entries for single-course edits. If the course is already in the roadmap, its placement is updated (moved) rather than duplicated. Self-contained: one call is the answer. Additive merge is done on existing roadmap entries (thin wrapper over existing tRPC procedures, no new Prisma queries).",
  inputSchema: upsertRoadmapEntrySchema,
  toWidgetProps: roadmapViewToWidgetProps(false),
  run: async ({ caller }, { roadmapId, courseCode, yearNumber, term, sortOrder }) => {
    try {
      const trimmedCode = courseCode.trim();
      if (!trimmedCode) return errText("courseCode must not be empty");

      // Resolve roadmap id: explicit, else active.
      let resolvedId = roadmapId?.trim() ?? "";
      if (!resolvedId) {
        const mine = (await caller.roadmaps.listMine()) as unknown as Array<{
          id: string;
          isActive?: boolean;
        }>;
        const active = mine.find((r) => r.isActive) ?? mine[0];
        if (!active) {
          return errText("You don't have any roadmaps yet. Create one first, then ask again.");
        }
        resolvedId = active.id;
      }

      // Resolve courseId from courseCode via existing procedure (thin wrapper).
      const course = (await caller.courses.getByCourseCode({ code: trimmedCode })) as unknown as
        | { id: string; code: string; name: string }
        | null;
      if (!course) return errText(`Course ${trimmedCode} not found`);

      // Fetch current entries (existing tRPC procedure).
      const current = (await caller.roadmaps.getMine({ roadmapId: resolvedId })) as unknown as {
        roadmap: { id: string };
        entries: Array<{
          courseId: string;
          yearNumber: number;
          term: string;
          sortOrder: number;
        }>;
      };

      // Build additive entries: keep all existing entries except any with the same courseId (moved/updated),
      // then append the new/updated placement. Handle sortOrder default: next slot in that year/term.
      const existing = current.entries ?? [];
      const filtered = existing.filter((e) => e.courseId !== course.id);
      let effectiveSortOrder = sortOrder;
      if (effectiveSortOrder === undefined) {
        const sameTerm = filtered.filter((e) => e.yearNumber === yearNumber && e.term === term);
        const maxSort = sameTerm.reduce((m, e) => Math.max(m, e.sortOrder), -1);
        effectiveSortOrder = Math.min(maxSort + 1, 99);
      }
      const nextEntries = [
        ...filtered.map((e) => ({
          courseId: e.courseId,
          yearNumber: e.yearNumber,
          term: e.term as "T1" | "T2" | "T3A" | "T3B",
          sortOrder: e.sortOrder,
        })),
        { courseId: course.id, yearNumber, term, sortOrder: effectiveSortOrder },
      ];
      // Deterministic save order: by year/term then sortOrder, then courseId.
      const TERM_ORDER: Record<string, number> = { T1: 0, T2: 1, T3A: 2, T3B: 3 };
      nextEntries.sort(
        (a, b) =>
          a.yearNumber - b.yearNumber ||
          (TERM_ORDER[a.term] ?? 99) - (TERM_ORDER[b.term] ?? 99) ||
          a.sortOrder - b.sortOrder ||
          a.courseId.localeCompare(b.courseId),
      );

      await caller.roadmaps.saveEntries({ roadmapId: resolvedId, entries: nextEntries });

      // Full updated roadmap view (buildRoadmapView thin wrapper).
      let roadmapView: unknown;
      try {
        roadmapView = await buildRoadmapView(caller, resolvedId);
      } catch {
        roadmapView = { roadmapId: resolvedId, error: "Could not fetch updated roadmap view" };
      }

      // Feasibility info (reuse check logic via fetching current state + running local check that mirrors
      // check-roadmap-feasibility's roadmap-term checks). For full fidelity (including EXAM_CLASH + PREREQ
      // against DB), we run a lightweight inlined check that reuses the existing feasibility approach but
      // avoids duplicating data-access: just call getMine + getByCourseCode + timetable checks inline? For now,
      // the most faithful "cheaply callable" path is to synthesize feasibility from the roadmapView entries
      // plus a single timetable exam-clash pass when a timetable exists. To stay thin-wrapped, do a minimal
      // feasibility pass: duplicates + prereq-missing via the same helpers would duplicate logic, so call out to
      // Timetable + Course lookups already available. Keep it robust: if any lookup fails, feasibility is null.
      let feasibility: unknown = null;
      try {
        feasibility = await runFeasibility(caller, resolvedId);
      } catch {
        feasibility = null;
      }

      return jsonText({ roadmapView, feasibility });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

// Lightweight feasibility derivation reusing the same deterministic checks as
// check-roadmap-feasibility, but operating on the caller-provided data via
// thin-wrapper procedures only. Kept in-file so the tool remains self-contained
// without importing from read/feasibility (which carries tool registration concerns).

function extractPrereqCodesLocal(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const prereqClause = raw.split(/\bmutually\s+exclusive\b/i)[0] ?? "";
  const matches = prereqClause.match(/\b[A-Z]{2,4}(?:-[A-Z]{2,4})?\s?\d{3,4}(?:\/\d{3,4})?\b/g) ?? [];
  const codes = new Set<string>();
  for (const match of matches) {
    const normalized = match.replace(/\s/g, "").toUpperCase();
    const [base, alt] = normalized.split("/");
    if (base) codes.add(base);
    if (alt) codes.add(alt);
  }
  return [...codes];
}

type FeasibilityIssue = { type: string; courseCode: string; courseName: string; detail: string };

async function runFeasibility(
  caller: unknown,
  roadmapId: string,
): Promise<{ issues: FeasibilityIssue[]; isFeasible: boolean }> {
  const c = caller as {
    roadmaps: { getMine: (a: { roadmapId: string }) => Promise<unknown> };
    courses: { getByCourseCode: (a: { code: string }) => Promise<unknown> };
    timetable: {
      listMine: (a: { acadTermId: string }) => Promise<unknown>;
      getArrangement: (a: { timetableId: string }) => Promise<unknown>;
    };
    acadTerms: { current: () => Promise<unknown> };
  };
  const { entries } = (await c.roadmaps.getMine({ roadmapId })) as {
    entries: Array<{ course: { code: string; name: string }; yearNumber: number; term: string }>;
  };

  const issues: FeasibilityIssue[] = [];
  const flagged = new Set<string>();
  const flagCourse = (issue: FeasibilityIssue, dedupKey?: string) => {
    const key = dedupKey ? `${issue.type}|${issue.courseCode}|${dedupKey}` : `${issue.type}|${issue.courseCode}`;
    if (flagged.has(key)) return;
    flagged.add(key);
    issues.push(issue);
  };

  const TERM_ORDER: Record<string, number> = { T1: 0, T2: 1, T3A: 2, T3B: 3 };
  const sortByTerm = <T extends { yearNumber: number; term: string }>(arr: T[]): T[] =>
    [...arr].sort((a, b) => a.yearNumber - b.yearNumber || (TERM_ORDER[a.term] ?? 99) - (TERM_ORDER[b.term] ?? 99));

  // TERM_DUPLICATE
  const byTerm = new Map<string, typeof entries>();
  for (const e of entries) {
    const key = `${e.yearNumber}|${e.term}`;
    const list = byTerm.get(key) ?? [];
    list.push(e);
    byTerm.set(key, list);
  }
  for (const [key, list] of byTerm) {
    const [year, term] = key.split("|");
    const counts = new Map<string, number>();
    for (const e of list) counts.set(e.course.code, (counts.get(e.course.code) ?? 0) + 1);
    for (const [code, count] of counts) {
      if (count > 1) {
        flagCourse(
          {
            type: "TERM_DUPLICATE",
            courseCode: code,
            courseName: list.find((e) => e.course.code === code)?.course.name ?? code,
            detail: `Course ${code} appears ${count} times in Year ${year} ${term}.`,
          },
          `${year}|${term}`,
        );
      }
    }
  }

  // PREREQ_MISSING
  const courseDetail = new Map<string, { enrolmentRequirements: string | null } | null>();
  const ordered = sortByTerm(entries);
  const groups = new Map<string, typeof entries>();
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
        try {
          const detail = (await c.courses.getByCourseCode({ code })) as {
            enrolmentRequirements: string | null;
          } | null;
          courseDetail.set(code, detail);
        } catch {
          courseDetail.set(code, null);
        }
      }
      const detail = courseDetail.get(code) ?? null;
      const required = extractPrereqCodesLocal(detail?.enrolmentRequirements).filter((x) => x !== code);
      const missing = required.filter((x) => !taken.has(x));
      if (missing.length > 0) {
        flagCourse({
          type: "PREREQ_MISSING",
          courseCode: code,
          courseName: e.course.name,
          detail: `Course ${code} requires ${missing.join(", ")} ${
            missing.length === 1 ? "which isn't" : "which aren't"
          } planned in an earlier term. Raw requirement: "${detail?.enrolmentRequirements ?? ""}"`,
        });
      }
    }
    for (const e of list) taken.add(e.course.code);
  }

  // EXAM_CLASH (best-effort: derive from current term's timetable if available)
  let clashTermId = "";
  try {
    const term = (await c.acadTerms.current()) as { id: string } | null;
    if (term?.id) clashTermId = term.id;
  } catch {
    // ignore
  }
  if (clashTermId) {
    try {
      const mine = (await c.timetable.listMine({ acadTermId: clashTermId })) as Array<{
        id: string;
        isActive?: boolean;
      }>;
      const timetable = mine.find((t) => t.isActive) ?? mine[0];
      if (timetable) {
        const arrangement = (await c.timetable.getArrangement({ timetableId: timetable.id })) as {
          slots: Array<{
            classId: string;
            courseCode: string;
            courseName: string;
            examTimings?: Array<{ date: unknown; startTime: string; endTime: string }>;
          }>;
        };
        const toMinutes = (time: string): number => {
          const m = /^(\d{1,2}):(\d{2})$/.exec(time);
          if (!m) return Number.NaN;
          return Number(m[1]!) * 60 + Number(m[2]!);
        };
        const intervalsOverlap = (aS: string, aE: string, bS: string, bE: string): boolean => {
          const [as, ae, bs, be] = [toMinutes(aS), toMinutes(aE), toMinutes(bS), toMinutes(bE)];
          if ([as, ae, bs, be].some((v) => Number.isNaN(v))) return false;
          return as < be && bs < ae;
        };
        const dateKey = (d: unknown): string => {
          if (d instanceof Date) return d.toISOString().slice(0, 10);
          if (typeof d === "string") return d.slice(0, 10);
          return String(d);
        };
        const exams: Array<{
          courseCode: string;
          courseName: string;
          date: string;
          startTime: string;
          endTime: string;
        }> = [];
        for (const slot of arrangement.slots ?? []) {
          for (const ex of slot.examTimings ?? []) {
            exams.push({
              courseCode: slot.courseCode,
              courseName: slot.courseName,
              date: dateKey(ex.date),
              startTime: ex.startTime,
              endTime: ex.endTime,
            });
          }
        }
        const seenPairs = new Set<string>();
        for (let i = 0; i < exams.length; i++) {
          for (let j = i + 1; j < exams.length; j++) {
            const a = exams[i]!;
            const b = exams[j]!;
            if (a.courseCode === b.courseCode) continue;
            if (a.date === b.date && intervalsOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
              const pairKey = [a.courseCode, b.courseCode].sort().join("|") + `|${a.date}`;
              if (seenPairs.has(pairKey)) continue;
              seenPairs.add(pairKey);
              issues.push({
                type: "EXAM_CLASH",
                courseCode: a.courseCode,
                courseName: a.courseName,
                detail: `Exams for ${a.courseCode} and ${b.courseCode} overlap on ${a.date} (${a.startTime}-${a.endTime} vs ${b.startTime}-${b.endTime}).`,
              });
            }
          }
        }
      }
    } catch {
      // best-effort; skip
    }
  }

  return { issues, isFeasible: issues.length === 0 };
}
