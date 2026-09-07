import { z } from "zod";

import { pickActiveOrFirst } from "../../current";
import {
  TERM_ORDER,
  checkExamClashes,
  checkPrereqs,
  checkTermDuplicates,
  createIssueCollector,
  dateKey,
  roadmapTermSchema,
  type FeasibilityEntry,
  type FeasibilityIssue,
} from "../feasibility-check";
import {
  buildRoadmapView,
  roadmapViewToViewProps,
} from "../roadmap-view-shared";
import {
  confirmField,
  errText,
  errorMessage,
  jsonText,
  type McpTool,
} from "../../types";

const termSchema = roadmapTermSchema;

const upsertRoadmapEntrySchema = z.object({
  roadmapId: z
    .string()
    .optional()
    .describe("Roadmap id from my-roadmaps. Omit to use your active roadmap."),
  courseCode: z
    .string()
    .min(1)
    .describe("Course code, e.g. COR-IS1702 or ACCT102"),
  yearNumber: z.number().int().min(1).max(8).describe("Year number, 1..8"),
  term: termSchema.describe("Term: T1 | T2 | T3A | T3B"),
  sortOrder: z
    .number()
    .int()
    .min(0)
    .max(99)
    .optional()
    .describe(
      "Optional sort order within the term (0..99); defaults to next slot in that year/term",
    ),
  ...confirmField,
});

export const upsertRoadmapEntryTool: McpTool<typeof upsertRoadmapEntrySchema> =
  {
    name: "upsert-roadmap-entry",
    description:
      "Add a course to a study roadmap (additive: does NOT wipe other entries). Provide the roadmap id (omit for your active roadmap), a course code (e.g. ACCT102), and the desired placement year + term (e.g. year 3, T1). Returns the full updated roadmap (via roadmap-view) PLUS feasibility info { issues, isFeasible } (PREREQ_MISSING / TERM_DUPLICATE / EXAM_CLASH - same as check-roadmap-feasibility). Replaces save-roadmap-entries for single-course edits. If the course is already in the roadmap, its placement is updated (moved) rather than duplicated. Self-contained: one call is the answer. Additive merge is done on existing roadmap entries (thin wrapper over existing tRPC procedures, no new Prisma queries).",
    inputSchema: upsertRoadmapEntrySchema,
    toViewProps: roadmapViewToViewProps(false),
    run: async (
      { caller },
      { roadmapId, courseCode, yearNumber, term, sortOrder },
    ) => {
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
          const active = pickActiveOrFirst(mine);
          if (!active) {
            return errText(
              "You don't have any roadmaps yet. Create one first, then ask again.",
            );
          }
          resolvedId = active.id;
        }

        // Resolve courseId from courseCode via existing procedure (thin wrapper).
        const course = (await caller.courses.getByCourseCode({
          code: trimmedCode,
        })) as unknown as { id: string; code: string; name: string } | null;
        if (!course) return errText(`Course ${trimmedCode} not found`);

        // Fetch current entries (existing tRPC procedure).
        const current = (await caller.roadmaps.getMine({
          roadmapId: resolvedId,
        })) as unknown as {
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
          const sameTerm = filtered.filter(
            (e) => e.yearNumber === yearNumber && e.term === term,
          );
          const maxSort = sameTerm.reduce(
            (m, e) => Math.max(m, e.sortOrder),
            -1,
          );
          effectiveSortOrder = Math.min(maxSort + 1, 99);
        }
        const nextEntries = [
          ...filtered.map((e) => ({
            courseId: e.courseId,
            yearNumber: e.yearNumber,
            term: e.term as "T1" | "T2" | "T3A" | "T3B",
            sortOrder: e.sortOrder,
          })),
          {
            courseId: course.id,
            yearNumber,
            term,
            sortOrder: effectiveSortOrder,
          },
        ];
        // Deterministic save order: by year/term then sortOrder, then courseId.
        nextEntries.sort(
          (a, b) =>
            a.yearNumber - b.yearNumber ||
            (TERM_ORDER[a.term] ?? 99) - (TERM_ORDER[b.term] ?? 99) ||
            a.sortOrder - b.sortOrder ||
            a.courseId.localeCompare(b.courseId),
        );

        await caller.roadmaps.saveEntries({
          roadmapId: resolvedId,
          entries: nextEntries,
        });

        // Full updated roadmap view (buildRoadmapView thin wrapper).
        let roadmapView: unknown;
        try {
          roadmapView = await buildRoadmapView(caller, resolvedId);
        } catch {
          roadmapView = {
            roadmapId: resolvedId,
            error: "Could not fetch updated roadmap view",
          };
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

// Feasibility derivation reusing the shared pure engine
// (../feasibility-check), operating on caller-provided data via thin-wrapper
// procedures only. Resolution failures on individual course lookups degrade to
// "no known requirements" (best-effort); exam data degrades to skipped.

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
    entries: FeasibilityEntry[];
  };

  const { issues, flagCourse } = createIssueCollector();

  // TERM_DUPLICATE
  checkTermDuplicates(entries, flagCourse);

  // PREREQ_MISSING (best-effort per course: lookup failure -> no requirements)
  const courseDetail = new Map<string, string | null>();
  await checkPrereqs(
    entries,
    async (code) => {
      if (!courseDetail.has(code)) {
        try {
          const detail = (await c.courses.getByCourseCode({ code })) as {
            enrolmentRequirements: string | null;
          } | null;
          courseDetail.set(code, detail?.enrolmentRequirements ?? null);
        } catch {
          courseDetail.set(code, null);
        }
      }
      return courseDetail.get(code) ?? null;
    },
    flagCourse,
  );

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
      const mine = (await c.timetable.listMine({
        acadTermId: clashTermId,
      })) as Array<{
        id: string;
        isActive?: boolean;
      }>;
      const timetable = pickActiveOrFirst(mine);
      if (timetable) {
        const arrangement = (await c.timetable.getArrangement({
          timetableId: timetable.id,
        })) as {
          slots: Array<{
            courseCode: string;
            courseName: string;
            examTimings?: Array<{
              date: unknown;
              startTime: string;
              endTime: string;
            }>;
          }>;
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
        checkExamClashes(exams, (issue) => issues.push(issue));
      }
    } catch {
      // best-effort; skip
    }
  }

  return { issues, isFeasible: issues.length === 0 };
}
