import { api } from "@/common/tools/trpc/server";

import {
  courseFeedInput,
  homeFeedInput,
  MEMBER_FEED_INPUT,
  parseReviewFeedParams,
  professorFeedInput,
} from "./reviewFeed";

type RawSearchParams = { filter?: unknown; sort?: unknown };

/**
 * Puts the first page of the review feed in the request's query client, under
 * the procedure the client will read for this session state. The caller wraps
 * the feed in `HydrateClient`, so the page opens with the reviews already in
 * place and the browser makes no request for them.
 */
export const prefetchReviewFeed = async (
  scope:
    | { variant: "home" }
    | { variant: "course"; code: string; slugs?: string[] }
    | { variant: "professor"; slug: string; courseCodes?: string[] },
  rawParams: RawSearchParams,
  isAuthenticated: boolean,
) => {
  const params = parseReviewFeedParams(rawParams);

  switch (scope.variant) {
    case "course": {
      const input = courseFeedInput(scope, params);
      return isAuthenticated
        ? api.reviews.getByCourseCodeProtected.prefetchInfinite({
            ...input,
            ...MEMBER_FEED_INPUT,
          })
        : api.reviews.getByCourseCode.prefetchInfinite(input);
    }
    case "professor": {
      const input = professorFeedInput(scope, params);
      return isAuthenticated
        ? api.reviews.getByProfSlugProtected.prefetchInfinite({
            ...input,
            ...MEMBER_FEED_INPUT,
          })
        : api.reviews.getByProfSlug.prefetchInfinite(input);
    }
    case "home": {
      const input = homeFeedInput(params);
      return isAuthenticated
        ? api.reviews.getAllProtected.prefetchInfinite({
            ...input,
            ...MEMBER_FEED_INPUT,
          })
        : api.reviews.getAll.prefetchInfinite(input);
    }
  }
};
