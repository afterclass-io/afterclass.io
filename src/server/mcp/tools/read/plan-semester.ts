import { z } from "zod";

import { errText, errorMessage, jsonText, type McpTool, type ToolContext } from "../../types";
import { resolveFacultyId } from "./faculties";

const planSemesterSchema = z.object({
  targetTermId: z
    .string()
    .optional()
    .describe(
      "Academic term id from list-acad-terms; defaults to the next term after the current one",
    ),
  facultyId: z
    .union([z.number().int(), z.string()])
    .optional()
    .describe("Faculty id or acronym (e.g. 4 or SCIS; obtain via list-faculties); defaults to the user's faculty"),
  limit: z.number().int().min(1).max(20).default(10),
  goal: z
    .string()
    .optional()
    .describe(
      "The user's goal in their own words (e.g. 'data engineering'); when senior candidates are empty, falls back to catalog search on this text with reason 'fallback-catalog'",
    ),
});

/** Upcoming terms searched beyond the target term when it yields nothing. */
const FALLBACK_FANOUT_TERMS = 2;

type CatalogHit = {
  id: string;
  code: string;
  name: string;
  creditUnits: number;
};

/**
 * Ids of the nearest upcoming terms after `targetTermId` (by startDt),
 * bounded by `count`. Best-effort: returns [] when the term list is
 * unavailable, so the fallback still covers the target term.
 */
async function upcomingTermIds(
  caller: ToolContext["caller"],
  targetTermId: string,
  count: number,
): Promise<string[]> {
  try {
    const terms = await caller.acadTerms.list();
    const sorted = [...terms].sort(
      (a, b) => new Date(a.startDt).getTime() - new Date(b.startDt).getTime(),
    );
    const idx = sorted.findIndex((t) => t.id === targetTermId);
    if (idx < 0) return [];
    return sorted.slice(idx + 1, idx + 1 + count).map((t) => t.id);
  } catch {
    return [];
  }
}

export const planSemesterTool: McpTool<typeof planSemesterSchema> = {
  name: "plan-semester",
  description:
    "Plan the user's next semester: given their progression (active roadmap + matriculation term), returns the target academic term, the user's position (year/term), and ranked course candidates that seniors in the same faculty took at that point in their roadmap (frequency + upvotes). When seniors have nothing (candidates empty) and a goal is given, falls back to catalog search on the goal across the target + upcoming terms (reason 'fallback-catalog', per-course offeredIn). Use this for 'what should I take next term' / 'plan inspired by seniors' questions instead of chaining many lookups.",
  inputSchema: planSemesterSchema,
  readOnly: true,
  run: async ({ caller }, input) => {
    try {
      // Students say "SCIS", not numeric ids: resolve acronyms via the
      // faculties table (numbers pass through untouched).
      let facultyId = input.facultyId;
      if (typeof facultyId === "string") {
        const resolved = await resolveFacultyId(facultyId);
        if (!resolved.ok) return errText(resolved.errText);
        facultyId = resolved.value;
      }
      // `goal` is a tool-layer param: the procedure knows nothing about it.
      const { goal, ...procInput } = input;
      const result = (await caller.roadmaps.planSemester({ ...procInput, facultyId })) as {
        targetTerm: { id: string } | null;
        userPosition: unknown;
        candidates: Array<{ courseId: string }>;
        totalSeniors: number;
      };
      // Senior path intact: non-empty candidates, or no goal to fall back on.
      const trimmedGoal = goal?.trim() ?? "";
      if (result.candidates.length > 0 || !trimmedGoal || !result.targetTerm) {
        return jsonText(result);
      }
      // Fallback: target term first (defaulted by the procedure, never
      // guessed), then fan out to the nearest upcoming terms if thin.
      // searchCourses only returns courses with class rows for the queried
      // term, so per-course `offeredIn` is the honest availability signal.
      const targetTermId = result.targetTerm.id;
      const termIds = [
        targetTermId,
        ...(await upcomingTermIds(caller, targetTermId, FALLBACK_FANOUT_TERMS)),
      ];
      const byCourse = new Map<
        string,
        CatalogHit & { offeredIn: string[] }
      >();
      for (const acadTermId of termIds) {
        const hits = (await caller.timetable.searchCourses({
          acadTermId,
          query: trimmedGoal,
          facultyId,
          // searchCourses caps at 20 rows; the tool limit applies below.
        })) as CatalogHit[];
        for (const h of hits) {
          const agg = byCourse.get(h.id);
          if (agg) {
            agg.offeredIn.push(acadTermId);
          } else {
            byCourse.set(h.id, { ...h, offeredIn: [acadTermId] });
          }
        }
        if (byCourse.size >= input.limit) break;
      }
      return jsonText({
        ...result,
        reason: "fallback-catalog",
        candidates: [...byCourse.values()].slice(0, input.limit).map((c) => ({
          courseId: c.id,
          code: c.code,
          name: c.name,
          creditUnits: c.creditUnits,
          offeredIn: c.offeredIn,
        })),
      });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
