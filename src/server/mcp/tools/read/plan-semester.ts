import { z } from "zod";

import { errText, errorMessage, jsonText, type McpTool } from "../../types";
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
});

export const planSemesterTool: McpTool<typeof planSemesterSchema> = {
  name: "plan-semester",
  description:
    "Plan the user's next semester: given their progression (active roadmap + matriculation term), returns the target academic term, the user's position (year/term), and ranked course candidates that seniors in the same faculty took at that point in their roadmap (frequency + upvotes). Use this for 'what should I take next term' / 'plan inspired by seniors' questions instead of chaining many lookups.",
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
      return jsonText(await caller.roadmaps.planSemester({ ...input, facultyId }));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
