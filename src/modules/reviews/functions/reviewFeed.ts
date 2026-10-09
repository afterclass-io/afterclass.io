import { z } from "zod";

import { ReviewsFilterFor, ReviewsSortBy } from "@/common/types/reviews";

/**
 * Query inputs of the review feed. The server prefetch and the client loader
 * both build their inputs here, so the two always produce the same TanStack
 * Query key and the hydrated page is the page the client reads.
 */

export type ReviewFeedParams = {
  filterFor: ReviewsFilterFor;
  sortBy: ReviewsSortBy;
};

/** The first value of a search parameter, as `URLSearchParams.get` returns it. */
const firstValue = (value: unknown) =>
  Array.isArray(value) ? (value[0] as unknown) : value;

/** Reads `filter` and `sort`, falling back to the defaults on unknown values. */
export const parseReviewFeedParams = (raw: {
  filter?: unknown;
  sort?: unknown;
}): ReviewFeedParams => ({
  filterFor: z
    .enum(ReviewsFilterFor)
    .catch(ReviewsFilterFor.ALL)
    .parse(firstValue(raw.filter)),
  sortBy: z
    .enum(ReviewsSortBy)
    .catch(ReviewsSortBy.LATEST)
    .parse(firstValue(raw.sort)),
});

/** Added to the input of the signed-in procedures, and only to those. */
export const MEMBER_FEED_INPUT = { includeEngagement: true } as const;

export const homeFeedInput = (params: ReviewFeedParams) => ({ ...params });

export const courseFeedInput = (
  scope: { code: string; slugs?: string[] },
  params: ReviewFeedParams,
) => ({ code: scope.code, slugs: scope.slugs, ...params });

export const professorFeedInput = (
  scope: { slug: string; courseCodes?: string[] },
  params: ReviewFeedParams,
) => ({ slug: scope.slug, courseCodes: scope.courseCodes, ...params });
