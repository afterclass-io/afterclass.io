import { z } from "zod";

import { ReviewsFilterFor, ReviewsSortBy } from "@/modules/reviews/types";

import { errText, errorMessage, jsonText, type McpTool, type ToolResult } from "../../types";

/** Flat review-card shape consumed by the review-cards widget. */
interface ReviewCard {
  id: string;
  body: string | null;
  tips: string | null;
  rating: number | null;
  labels: string[];
  voteCount: number;
  createdAt: string;
  courseCode: string | null;
  professorName: string | null;
}

/**
 * Normalize a review tool's JSON text output into review-cards widget props.
 * The protected procedures return { items, nextCursor } where items are
 * flattened Reviews (reviewLabels[{name}], likeCount, courseCode,
 * professorName, createdAt as epoch ms); a bare array of raw prisma-shaped
 * rows (reviewLabels[{label.name}], countVotes, reviewedCourse,
 * reviewedProfessor) is also accepted for robustness.
 * The tool's `run` embeds `context` (course code / professor slug) alongside
 * the procedure payload so the widget header stays populated even on empty
 * results; this helper reads that `context` directly.
 */
function reviewCardsProps(text: string): Record<string, unknown> {
  try {
    const data = JSON.parse(text) as unknown;
    const rawItems: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray((data as { items?: unknown[] } | null)?.items)
        ? (data as { items: unknown[] }).items
        : [];
    const context =
      !Array.isArray(data) &&
      data !== null &&
      typeof data === "object" &&
      typeof (data as Record<string, unknown>).context === "string"
        ? ((data as Record<string, unknown>).context as string)
        : "";
    const reviews: ReviewCard[] = rawItems.map((item) => {
      const r = item as Record<string, unknown>;
      const labels = Array.isArray(r.reviewLabels)
        ? (r.reviewLabels as Array<Record<string, unknown>>)
            .map(
              (rl) =>
                ((rl.label as { name?: string } | null | undefined)?.name ??
                  rl.name) as string | undefined,
            )
            .filter((n): n is string => typeof n === "string")
        : Array.isArray(r.labels)
          ? (r.labels as unknown[]).filter(
              (n): n is string => typeof n === "string",
            )
          : [];
      const createdAt = r.createdAt;
      return {
        id: (r.id as string) ?? "",
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string must coerce to null for widget
        body: (r.body as string | null) || null,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string must coerce to null for widget
        tips: (r.tips as string | null) || null,
        rating: (r.rating as number | null) ?? null,
        labels,
        voteCount:
          (r.voteCount as number | undefined) ??
          (r.likeCount as number | undefined) ??
          (r.countVotes as number | undefined) ??
          0,
        createdAt:
          typeof createdAt === "number"
            ? new Date(createdAt).toISOString()
            : typeof createdAt === "string"
              ? createdAt
              : "",
        courseCode:
          (r.courseCode as string | null | undefined) ??
          (r.reviewedCourse as { code?: string } | null | undefined)?.code ??
          null,
        professorName:
          (r.professorName as string | null | undefined) ??
          (r.reviewedProfessor as { name?: string } | null | undefined)?.name ??
          null,
      };
    });
    return { context, reviews };
  } catch {
    return { raw: text };
  }
}

const reviewCardsToWidgetProps = (result: ToolResult): Record<string, unknown> => {
  const text = result.content.find((c) => c.type === "text")?.text ?? "";
  return reviewCardsProps(text);
};

const getCourseReviewsSchema = z.object({
  code: z.string().describe("Exact course code"),
  limit: z.number().int().min(1).max(20).default(10),
});

export const getCourseReviewsTool: McpTool<typeof getCourseReviewsSchema> = {
  name: "get-course-reviews",
  description:
    "Read student reviews for a course, including full review text. Read-only: you may summarise reviews but must NEVER write, edit, or create reviews.",
  inputSchema: getCourseReviewsSchema,
  readOnly: true,
  widgetName: "review-cards",
  toWidgetProps: reviewCardsToWidgetProps,
  run: async ({ caller }, { code, limit }) => {
    try {
      const data = await caller.reviews.getByCourseCodeProtected({
        code,
        limit,
        filterFor: ReviewsFilterFor.ALL,
        sortBy: ReviewsSortBy.LATEST,
      });
      const payload = Array.isArray(data)
        ? { context: code, items: data }
        : { context: code, ...(data as Record<string, unknown>) };
      return jsonText(payload);
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const getProfessorReviewsSchema = z.object({
  slug: z.string().describe("Professor slug, e.g. from get-professor"),
  limit: z.number().int().min(1).max(20).default(10),
});

export const getProfessorReviewsTool: McpTool<typeof getProfessorReviewsSchema> = {
  name: "get-professor-reviews",
  description:
    "Read student reviews for a professor, including full review text. Use when the user asks what students say about a professor or wants concrete review examples. Read-only: NEVER write, edit, or create reviews.",
  inputSchema: getProfessorReviewsSchema,
  readOnly: true,
  widgetName: "review-cards",
  toWidgetProps: reviewCardsToWidgetProps,
  run: async ({ caller }, { slug, limit }) => {
    try {
      const data = await caller.reviews.getByProfSlugProtected({
        slug,
        limit,
        filterFor: ReviewsFilterFor.ALL,
        sortBy: ReviewsSortBy.LATEST,
      });
      const payload = Array.isArray(data)
        ? { context: slug, items: data }
        : { context: slug, ...(data as Record<string, unknown>) };
      return jsonText(payload);
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
  limit: z.number().int().min(1).max(50).default(20),
});

export const getBidResultsTool: McpTool<typeof getBidResultsSchema> = {
  name: "get-bid-results",
  description: "Get past bid results (clearing medians/mins) for a class, course code, and/or section.",
  inputSchema: getBidResultsSchema,
  readOnly: true,
  run: async ({ caller }, input) => {
    try {
      const { limit = 20, ...filters } = input as {
        classId?: string;
        courseCode?: string;
        section?: string;
        limit?: number;
      };
      const data = (await caller.bidResults.getBy(filters)) as unknown;
      if (Array.isArray(data)) {
        return jsonText((data as unknown[]).slice(0, limit));
      }
      if (
        data !== null &&
        typeof data === "object" &&
        Array.isArray((data as { items?: unknown }).items)
      ) {
        const obj = data as { items: unknown[] } & Record<string, unknown>;
        return jsonText({ ...obj, items: obj.items.slice(0, limit) });
      }
      return jsonText(data);
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
