import { api } from "@/common/tools/trpc/server";

import {
  buildCourseReviewInput,
  buildHomeReviewInput,
  buildProfessorReviewInput,
  type ReviewFeedFilterParams,
} from "./reviewFeedInput";

type PrefetchReviewFeedArgs = ReviewFeedFilterParams & {
  isAuthenticated: boolean;
} & (
    | { variant: "home" }
    | { variant: "course"; code: string; slugs?: string[] }
    | { variant: "professor"; slug: string; courseCodes?: string[] }
  );

/**
 * Prefetches the review procedure the client loader will select for this
 * session, using the loader's own input builders so the hydrated query key is
 * the key the client reads. Callers wrap the feed in `HydrateClient`.
 */
export async function prefetchReviewFeed(args: PrefetchReviewFeedArgs) {
  switch (args.variant) {
    case "home": {
      const prefetch = args.isAuthenticated
        ? api.reviews.getAllProtected
        : api.reviews.getAll;
      await prefetch.prefetchInfinite(buildHomeReviewInput(args));
      return;
    }
    case "course": {
      const prefetch = args.isAuthenticated
        ? api.reviews.getByCourseCodeProtected
        : api.reviews.getByCourseCode;
      await prefetch.prefetchInfinite(buildCourseReviewInput(args));
      return;
    }
    case "professor": {
      const prefetch = args.isAuthenticated
        ? api.reviews.getByProfSlugProtected
        : api.reviews.getByProfSlug;
      await prefetch.prefetchInfinite(buildProfessorReviewInput(args));
      return;
    }
  }
}
