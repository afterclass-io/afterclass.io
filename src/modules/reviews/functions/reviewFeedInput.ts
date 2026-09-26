import type { parseReviewParams } from "./parseReviewParams";

/** Filter/sort values with the defaults from `parseReviewParams`. */
export type ReviewFeedFilterParams = ReturnType<typeof parseReviewParams>;

/**
 * Input builders shared by the server prefetch and the client loader. Either
 * side calling anything else risks a query-key mismatch, which silently
 * abandons the hydrated data and restores the double fetch #516 fixed.
 */

export function buildHomeReviewInput({
  filterFor,
  sortBy,
}: ReviewFeedFilterParams) {
  return { filterFor, sortBy };
}

export function buildCourseReviewInput({
  code,
  slugs,
  filterFor,
  sortBy,
}: ReviewFeedFilterParams & { code: string; slugs?: string[] }) {
  return { code, slugs, filterFor, sortBy };
}

export function buildProfessorReviewInput({
  slug,
  courseCodes,
  filterFor,
  sortBy,
}: ReviewFeedFilterParams & { slug: string; courseCodes?: string[] }) {
  return { slug, courseCodes, filterFor, sortBy };
}

/** The one options object for all three infinite review queries. */
export const infiniteReviewQueryOptions = {
  getNextPageParam: (lastPage: { nextCursor?: string }) => lastPage.nextCursor,
};
