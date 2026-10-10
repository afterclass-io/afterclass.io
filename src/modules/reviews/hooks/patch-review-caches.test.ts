// @vitest-environment jsdom
import { getQueryKey } from "@trpc/react-query";
import { beforeEach, describe, expect, it } from "vitest";

import { api, getQueryClient } from "@/common/tools/trpc/react";
import type { Review } from "@/common/types/reviews";

import { withVote } from "../functions/engagement";
import {
  getReviewCachesSnapshot,
  patchReviewInCaches,
  restoreReviewCaches,
} from "./patch-review-caches";

// These tests use the real tRPC React proxy on purpose. The first version of
// the helpers read `utils.queryClient`, which the proxy answers with a callable
// stand-in, so every vote threw in the browser while mocked tests stayed green.

const review = (id: string, likeCount: number) =>
  ({ id, likeCount, engagement: null }) as unknown as Review;

const feedKey = () => [
  ...getQueryKey(api.reviews.getByCourseCodeProtected),
  { input: { code: "IS215" }, type: "infinite" },
];

const readLikeCount = () => {
  const data = getQueryClient().getQueryData<{
    pages: Array<{ items: Review[] }>;
  }>(feedKey());
  return data?.pages[0]?.items[0]?.likeCount;
};

describe("patch-review-caches with the real tRPC proxy", () => {
  beforeEach(() => {
    getQueryClient().clear();
    getQueryClient().setQueryData(feedKey(), {
      pages: [{ items: [review("r1", 3)] }],
      pageParams: [undefined],
    });
  });

  it("patches a review in a cached feed page", () => {
    patchReviewInCaches("r1", (r) => withVote(r, 1));

    expect(readLikeCount()).toBe(4);
  });

  it("restores the snapshot it returned", () => {
    const snapshot = patchReviewInCaches("r1", (r) => withVote(r, 1));
    expect(readLikeCount()).toBe(4);

    restoreReviewCaches(snapshot);

    expect(readLikeCount()).toBe(3);
  });

  it("reads every protected feed cache into a snapshot", () => {
    expect(getReviewCachesSnapshot()).toHaveLength(1);
  });
});
