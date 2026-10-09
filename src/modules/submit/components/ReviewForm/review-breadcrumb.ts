import { ReviewableEnum } from "@/common/types/reviews";
import { type ReviewFormInputsSchema } from "@/common/tools/zod/schemas";

type ReviewItemInput = {
  body?: string;
  tips?: string;
  rating?: number;
  labels?: unknown[];
};

function describeItem(item: ReviewItemInput | undefined) {
  if (!item) return undefined;
  return {
    bodyLength: item.body?.length ?? 0,
    tipsLength: item.tips?.length ?? 0,
    rating: item.rating ?? 0,
    labelCount: item.labels?.length ?? 0,
  };
}

/**
 * Builds the Sentry breadcrumb for a review submission. It carries counts and
 * lengths only: review text, session data and names never reach Sentry (#505).
 */
export function buildReviewSubmitBreadcrumb(data: ReviewFormInputsSchema) {
  return {
    category: "review.submit",
    message: "Review submitted.",
    level: "info" as const,
    data: {
      type: data.type,
      submitAs: data.submitAs,
      [ReviewableEnum.COURSE]: describeItem(data[ReviewableEnum.COURSE]),
      [ReviewableEnum.PROFESSOR]: describeItem(data[ReviewableEnum.PROFESSOR]),
    },
  };
}
