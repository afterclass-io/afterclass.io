import { z } from "zod";

import { ReviewsFilterFor, ReviewsSortBy } from "@/modules/reviews/types";

import { resolveTermId } from "../../current";
import { errText, errorMessage, jsonText, type McpTool, type ToolResult } from "../../types";

/** Flat review-card shape consumed by the review-cards view. */
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
 * Normalize a review tool's JSON text output into review-cards view props.
 * The protected procedures return { items, nextCursor } where items are
 * flattened Reviews (reviewLabels[{name}], likeCount, courseCode,
 * professorName, createdAt as epoch ms); a bare array of raw prisma-shaped
 * rows (reviewLabels[{label.name}], countVotes, reviewedCourse,
 * reviewedProfessor) is also accepted for robustness.
 * The tool's `run` embeds `context` (course code / professor slug) alongside
 * the procedure payload so the view header stays populated even on empty
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
    // The restored nextCursor (review procedure's { items, nextCursor } page)
    // rides the payload so the review-cards view can page forward; absent
    // (bare array, unset cursor) stays absent — never null-filled — so the
    // optional view schema keeps parsing.
    const nextCursor =
      !Array.isArray(data) &&
      data !== null &&
      typeof data === "object" &&
      "nextCursor" in (data as Record<string, unknown>) &&
      typeof (data as Record<string, unknown>).nextCursor === "string"
        ? ((data as Record<string, unknown>).nextCursor as string)
        : undefined;
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
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string must coerce to null for view
        body: (r.body as string | null) || null,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string must coerce to null for view
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
    return {
      context,
      reviews,
      ...(nextCursor !== undefined ? { nextCursor } : {}),
    };
  } catch {
    return { raw: text };
  }
}

const reviewCardsToViewProps = (result: ToolResult): Record<string, unknown> => {
  const text = result.content.find((c) => c.type === "text")?.text ?? "";
  return reviewCardsProps(text);
};

const getCourseReviewsSchema = z.object({
  code: z.string().describe("Exact course code"),
  limit: z.number().int().min(1).max(20).default(10),
  // Optional cursor into the procedure's { items, nextCursor } page. When
  // omitted the first page is returned and `nextCursor` is embedded in the
  // payload alongside `context` (additive only — existing callers that pass
  // just { code, limit } see identical behavior plus the extra key).
  cursor: z.string().optional(),
});

export const getCourseReviewsTool: McpTool<typeof getCourseReviewsSchema> = {
  name: "get-course-reviews",
  description:
    "Read student reviews for a course, including full review text. Read-only: you may summarise reviews but must NEVER write, edit, or create reviews.",
  inputSchema: getCourseReviewsSchema,
  readOnly: true,
  toViewProps: reviewCardsToViewProps,
  run: async ({ caller }, { code, limit, cursor }) => {
    try {
      const data = await caller.reviews.getByCourseCodeProtected({
        code,
        limit,
        ...(cursor !== undefined ? { cursor } : {}),
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
  // Optional cursor — same contract as get-course-reviews above.
  cursor: z.string().optional(),
});

export const getProfessorReviewsTool: McpTool<typeof getProfessorReviewsSchema> = {
  name: "get-professor-reviews",
  description:
    "Read student reviews for a professor, including full review text. Use when the user asks what students say about a professor or wants concrete review examples. Read-only: NEVER write, edit, or create reviews.",
  inputSchema: getProfessorReviewsSchema,
  readOnly: true,
  toViewProps: reviewCardsToViewProps,
  run: async ({ caller }, { slug, limit, cursor }) => {
    try {
      const data = await caller.reviews.getByProfSlugProtected({
        slug,
        limit,
        ...(cursor !== undefined ? { cursor } : {}),
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

const getBidResultsSchema = z
  .object({
    classId: z.string().optional(),
    courseCode: z.string().optional(),
    section: z.string().optional(),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .refine((v) => Boolean(v.classId) || Boolean(v.courseCode && v.section), {
    message:
      "Provide classId, or courseCode + section together. Use get-classes to resolve a classId from a course code (and section).",
  });

export const getBidResultsTool: McpTool<typeof getBidResultsSchema> = {
  name: "get-bid-results",
  description:
    "Get past bid results (clearing medians/mins). Provide either a classId (use get-classes to resolve it from a course code and section) or a courseCode + section pair.",
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
  description:
    "List all academic terms (e.g. AY2026/27 Term 1). Returns { terms, currentTermId } - use currentTermId when a term-scoped tool needs a default.",
  inputSchema: listAcadTermsSchema,
  readOnly: true,
  run: async ({ caller }) => {
    try {
      const terms = await caller.acadTerms.list();
      let currentTermId: string | null = null;
      try {
        const current = await caller.acadTerms.current();
        currentTermId = current?.id ?? null;
      } catch {
        currentTermId = null;
      }
      return jsonText({ terms, currentTermId });
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
  description:
    "Get bid windows (rounds and dates) for an academic term. Returns { windows, currentWindowId }. Omit acadTermId to use the current term.",
  inputSchema: getBidWindowsSchema,
  readOnly: true,
  run: async ({ caller }, { acadTermId }) => {
    try {
      // Empty acadTermId must never reach SQL - resolveTermId trims and
      // falls back to the current term (friendly error when none exists).
      const term = await resolveTermId(caller, acadTermId);
      if (!term.ok) return errText(term.errText);
      const windows = await caller.bidWindows.getByAcadTerm({ acadTermId: term.value });
      let currentWindowId: number | null = null;
      try {
        const current = await caller.bidWindows.getCurrentWindow();
        currentWindowId = current?.id ?? null;
      } catch {
        currentWindowId = null;
      }
      return jsonText({ windows, currentWindowId });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
