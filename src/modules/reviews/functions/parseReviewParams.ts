import { z } from "zod";

import { ReviewsFilterFor, ReviewsSortBy } from "@/modules/reviews/types";

/**
 * The `filter`/`sort` search-parameter source. The client passes its
 * `URLSearchParams` (`.get`), the review route segments pass Next's
 * `searchParams` object (property access). Both resolve to the same defaults.
 */
export type ReviewParamSource =
  | { get(key: string): string | null }
  | Record<string, string | string[] | undefined>
  | undefined;

const readParam = (
  source: ReviewParamSource,
  key: string,
): string | undefined => {
  if (!source) return undefined;
  if (typeof (source as { get?: unknown }).get === "function") {
    return (
      (source as { get(key: string): string | null }).get(key) ?? undefined
    );
  }
  const value = (source as Record<string, string | string[] | undefined>)[key];
  return Array.isArray(value) ? value[0] : value;
};

/**
 * Parses the review feed's `filter` and `sort` search params, falling back to
 * the same defaults the server prefetch and the client loader must agree on.
 * Shared so the two can never drift into different query keys.
 */
export const parseReviewParams = (source: ReviewParamSource) => ({
  filterFor:
    z.enum(ReviewsFilterFor).safeParse(readParam(source, "filter")).data ??
    ReviewsFilterFor.ALL,
  sortBy:
    z.enum(ReviewsSortBy).safeParse(readParam(source, "sort")).data ??
    ReviewsSortBy.LATEST,
});
