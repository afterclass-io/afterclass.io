import { z } from "zod";

import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const getReviewSummarySchema = z
  .object({
    code: z.string().optional().describe("Course code (e.g. COR-STAT1202)"),
    professorSlug: z.string().optional().describe("Professor slug (e.g. john-doe)"),
  })
  .refine((v) => Boolean(v.code?.trim()) !== Boolean(v.professorSlug?.trim()), {
    message: "Provide exactly one of code or professorSlug",
  });

export const getReviewSummaryTool: McpTool<typeof getReviewSummarySchema> = {
  name: "get-review-summary",
  description:
    "Get aggregate review metadata for a course (by code) or professor (by slug): review count, average rating, and labelled tag counts. Provide exactly one of code or professorSlug.",
  inputSchema: getReviewSummarySchema,
  readOnly: true,
  run: async ({ caller }, { code, professorSlug }) => {
    try {
      const hasCode = Boolean(code?.trim());
      const hasSlug = Boolean(professorSlug?.trim());
      if (hasCode === hasSlug) {
        return errText("Provide exactly one of code or professorSlug");
      }
      if (hasCode) {
        const result = await caller.reviews.getMetadataForCourse({ code: code!.trim() });
        return jsonText({ kind: "course", code: code!.trim(), ...result });
      }
      const result = await caller.reviews.getMetadataForProf({ slug: professorSlug!.trim() });
      return jsonText({ kind: "professor", professorSlug: professorSlug!.trim(), ...result });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
