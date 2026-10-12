import { z } from "zod";

import { pickActiveOrFirst, resolveTermId } from "../../current";
import { errText, guardedRun, jsonText, type McpTool } from "../../types";
import {
  checkExamClashes,
  checkPrereqs,
  extractPrereqCodes,
} from "../feasibility-check";
import {
  NO_ROADMAPS_MESSAGE,
  collectExamSlots,
  resolveRoadmapId,
  scanRoadmapEntries,
} from "../roadmap-view-shared";

// Re-export the pure helpers for the existing feasibility unit tests
// (proof the extraction is behavior-preserving: same fns, new home).
export { extractPrereqCodes };

const checkRoadmapFeasibilitySchema = z.object({
  roadmapId: z
    .string()
    .optional()
    .describe(
      "Roadmap id from my-roadmaps. Omit to check your active roadmap.",
    ),
  termId: z
    .string()
    .optional()
    .describe(
      "Optional academic term id (from list-acad-terms). When provided, your timetable for that term is also checked for exam clashes.",
    ),
});

// ---------------------------------------------------------------------------
// Tool
// ---------------------------------------------------------------------------

export const checkRoadmapFeasibilityTool: McpTool<
  typeof checkRoadmapFeasibilitySchema
> = {
  name: "check-roadmap-feasibility",
  description:
    "Check a study roadmap for planning conflicts and return { issues, isFeasible }. Issue types: PREREQ_MISSING (a course's prerequisite isn't planned in an earlier term), TERM_DUPLICATE (the same course appears twice in one year/term), and EXAM_CLASH (two courses' exams overlap in the user's timetable - checked against the current term by default, or a term you specify). CAVEAT: if no timetable exists for the term, exam-clash checking is SKIPPED - the plan is not fully verified on the clash dimension, and isFeasible may be true even though exams were not checked. Use this before advising a student to commit to a plan, or when they ask 'is my plan feasible?'.",
  inputSchema: checkRoadmapFeasibilitySchema,
  readOnly: true,
  run: guardedRun(async ({ caller }, { roadmapId, termId }) => {
    // ---- 1. Resolve the roadmap (explicit, else the active one) ----
    const id = await resolveRoadmapId(caller, roadmapId ?? "");
    if (id === null) return errText(NO_ROADMAPS_MESSAGE);
    const { entries } = await caller.roadmaps.getMine({ roadmapId: id });

    // Dedup: PREREQ_MISSING keys on (type, courseCode) so a course planned in
    // several terms with the same missing prereq is reported once.
    // TERM_DUPLICATE passes an extra (yearNumber, term) key so the same
    // course duplicated in two different terms yields two issues (one per
    // term). EXAM_CLASH uses its own pair key (each distinct overlap is a
    // separate issue). See createIssueCollector.
    // ---- 2. TERM_DUPLICATE: same course twice in one (yearNumber, term) ----
    const { issues, flagCourse, codes } = scanRoadmapEntries(entries);

    // ---- 3. PREREQ_MISSING: prerequisite not in an earlier term ----
    // "Taken" = course codes planned in strictly earlier (year, term) slots.
    // A lookup failure rejects the whole tool (surfaced as errText below).
    const reqMap = new Map<string, string | null>();
    if (codes.length > 0) {
      const rows = await caller.courses.getEnrolmentRequirementsByCodes({
        codes,
      });
      for (const row of rows) {
        reqMap.set(row.code, row.enrolmentRequirements);
      }
    }
    await checkPrereqs(
      entries,
      async (code) => reqMap.get(code) ?? null,
      flagCourse,
    );

    // ---- 4. EXAM_CLASH: overlapping exams in the term's timetable ----
    // Omitted termId defaults to the current term (for consistency with the
    // other tools). If there is no current term either, EXAM_CLASH is simply
    // skipped - the roadmap-only checks still run.
    const clash = await resolveTermId(caller, termId);
    const clashTermId = clash.ok ? clash.value : "";
    if (clashTermId) {
      const mine = await caller.timetable.listMine({
        acadTermId: clashTermId,
      });
      const timetable = pickActiveOrFirst(mine);
      if (timetable) {
        const arrangement = await caller.timetable.getArrangement({
          timetableId: timetable.id,
        });
        checkExamClashes(collectExamSlots(arrangement.slots), (issue) =>
          issues.push(issue),
        );
      }
      // No timetable for the term -> no exam data -> EXAM_CLASH cannot be
      // evaluated for that term; roadmap-only checks still run.
    }

    return jsonText({ issues, isFeasible: issues.length === 0 });
  }),
};
