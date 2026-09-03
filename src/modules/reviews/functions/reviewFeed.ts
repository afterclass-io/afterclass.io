import { z } from "zod";

import { ReviewsFilterFor, ReviewsSortBy } from "@/modules/reviews/types";

/**
 * Shared by the server review pages (which resolve the session and prefetch
 * the feed) and the client ReviewItemLoader (which must request the exact
 * same query key after hydration). Keeping both halves of the query key —
 * procedure selection and filter/sort input — in one module is what makes the
 * #516 prefetch land on the key the client actually uses.
 */

export type ReviewFeedVariant = "home" | "course" | "professor";

export type ReviewFeedSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

/**
 * The procedure pair per variant is session-dependent: protected procedures
 * return private fields (and honor the UPVOTED filter), public ones zero the
 * rating and blank the body. The server page prefetches the one matching the
 * resolved session and passes `isAuthed` down, so the client picks the same
 * procedure immediately instead of re-deriving auth after hydration.
 */
export type ReviewFeedProcedure =
  | "getAll"
  | "getAllProtected"
  | "getByCourseCode"
  | "getByCourseCodeProtected"
  | "getByProfSlug"
  | "getByProfSlugProtected";

export function getReviewFeedProcedure(
  variant: "home",
  isAuthed: boolean,
): "getAll" | "getAllProtected";
export function getReviewFeedProcedure(
  variant: "course",
  isAuthed: boolean,
): "getByCourseCode" | "getByCourseCodeProtected";
export function getReviewFeedProcedure(
  variant: "professor",
  isAuthed: boolean,
): "getByProfSlug" | "getByProfSlugProtected";
export function getReviewFeedProcedure(
  variant: ReviewFeedVariant,
  isAuthed: boolean,
): ReviewFeedProcedure;
export function getReviewFeedProcedure(
  variant: ReviewFeedVariant,
  isAuthed: boolean,
): ReviewFeedProcedure {
  switch (variant) {
    case "course":
      return isAuthed ? "getByCourseCodeProtected" : "getByCourseCode";
    case "professor":
      return isAuthed ? "getByProfSlugProtected" : "getByProfSlug";
    default:
      return isAuthed ? "getAllProtected" : "getAll";
  }
}

/**
 * Derives the filter/sort query input from either the server's searchParams
 * object or the client's URLSearchParams. Both shapes must produce the same
 * values, since they become the `input` half of the query key.
 */
export const getReviewFeedParams = (
  searchParams: ReviewFeedSearchParams,
): { filterFor: ReviewsFilterFor; sortBy: ReviewsSortBy } => {
  // The client's URLSearchParams.get() returns the first value; mirror that
  // for the server's string | string[] shape so both produce the same input.
  const get = (key: string): string | undefined => {
    if (!searchParams) return undefined;
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined;
    }
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const parseFilterFor = () => {
    const parsed = z.enum(ReviewsFilterFor).safeParse(get("filter"));
    return parsed.success ? parsed.data : ReviewsFilterFor.ALL;
  };
  const parseSortBy = () => {
    const parsed = z.enum(ReviewsSortBy).safeParse(get("sort"));
    return parsed.success ? parsed.data : ReviewsSortBy.LATEST;
  };

  return {
    filterFor: parseFilterFor(),
    sortBy: parseSortBy(),
  };
};
