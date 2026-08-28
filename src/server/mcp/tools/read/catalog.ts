import { z } from "zod";

import { ReviewsFilterFor, ReviewsSortBy } from "@/modules/reviews/types";

import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const getCourseReviewsSchema = z.object({
  code: z.string().describe("Exact course code"),
  limit: z.number().int().min(1).max(50).default(20),
});

export const getCourseReviewsTool: McpTool<typeof getCourseReviewsSchema> = {
  name: "get-course-reviews",
  description:
    "Read student reviews for a course. Read-only: you may summarise reviews but must NEVER write, edit, or create reviews.",
  inputSchema: getCourseReviewsSchema,
  readOnly: true,
  run: async ({ caller }, { code, limit }) => {
    try {
      return jsonText(
        await caller.reviews.getByCourseCode({
          code,
          limit,
          filterFor: ReviewsFilterFor.ALL,
          sortBy: ReviewsSortBy.LATEST,
        }),
      );
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const getBidPredictionSchema = z.object({
  classId: z.string().describe("Class id; obtain from get-classes"),
});

export const getBidPredictionTool: McpTool<typeof getBidPredictionSchema> = {
  name: "get-bid-prediction",
  description: "Get the latest bid prediction (expected median and minimum clearing price) for a class.",
  inputSchema: getBidPredictionSchema,
  readOnly: true,
  run: async ({ caller }, { classId }) => {
    try {
      const prediction = await caller.bidPredictions.getBy({ classId });
      if (!prediction) return errText(`No prediction available for class ${classId}`);
      return jsonText(prediction);
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const getBidResultsSchema = z.object({
  classId: z.string().optional(),
  courseCode: z.string().optional(),
  section: z.string().optional(),
});

export const getBidResultsTool: McpTool<typeof getBidResultsSchema> = {
  name: "get-bid-results",
  description: "Get past bid results (clearing medians/mins) for a class, course code, and/or section.",
  inputSchema: getBidResultsSchema,
  readOnly: true,
  run: async ({ caller }, input) => {
    try {
      return jsonText(await caller.bidResults.getBy(input));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const listAcadTermsSchema = z.object({});

export const listAcadTermsTool: McpTool<typeof listAcadTermsSchema> = {
  name: "list-acad-terms",
  description: "List all academic terms (e.g. AY2026/27 Term 1).",
  inputSchema: listAcadTermsSchema,
  readOnly: true,
  run: async ({ caller }) => {
    try {
      return jsonText(await caller.acadTerms.list());
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const getBidWindowsSchema = z.object({
  acadTermId: z.string().optional(),
});

export const getBidWindowsTool: McpTool<typeof getBidWindowsSchema> = {
  name: "get-bid-windows",
  description: "Get bid windows (rounds and dates) for an academic term, or the current window when no term is given.",
  inputSchema: getBidWindowsSchema,
  readOnly: true,
  run: async ({ caller }, { acadTermId }) => {
    try {
      const result = acadTermId
        ? await caller.bidWindows.getByAcadTerm({ acadTermId })
        : await caller.bidWindows.getCurrentWindow();
      return jsonText(result);
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
