import { z } from "zod";

import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const planSemesterSchema = z.object({
  targetTermId: z
    .string()
    .optional()
    .describe(
      "Academic term id from list-acad-terms; defaults to the next term after the current one",
    ),
  facultyId: z
    .number()
    .int()
    .optional()
    .describe("Faculty id; defaults to the user's faculty"),
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
      return jsonText(await caller.roadmaps.planSemester(input));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
