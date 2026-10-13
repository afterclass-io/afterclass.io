import { hashKey } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { ReviewsFilterFor, ReviewsSortBy } from "@/common/types/reviews";

import {
  courseFeedInput,
  homeFeedInput,
  MEMBER_FEED_INPUT,
  parseReviewFeedParams,
  professorFeedInput,
} from "./reviewFeed";

describe("parseReviewFeedParams", () => {
  it("defaults to every review, newest first", () => {
    expect(parseReviewFeedParams({})).toEqual({
      filterFor: ReviewsFilterFor.ALL,
      sortBy: ReviewsSortBy.LATEST,
    });
  });

  it("reads known values", () => {
    expect(
      parseReviewFeedParams({ filter: "upvoted", sort: "top_votes" }),
    ).toEqual({
      filterFor: ReviewsFilterFor.UPVOTED,
      sortBy: ReviewsSortBy.TOP_VOTES,
    });
  });

  it("falls back to the defaults on unknown values", () => {
    expect(parseReviewFeedParams({ filter: "nope", sort: 3 })).toEqual({
      filterFor: ReviewsFilterFor.ALL,
      sortBy: ReviewsSortBy.LATEST,
    });
  });

  it("reads the first value of a repeated parameter, like URLSearchParams.get", () => {
    const fromServer = parseReviewFeedParams({
      filter: ["upvoted", "all"],
      sort: ["trending", "latest"],
    });
    const search = new URLSearchParams("filter=upvoted&filter=all");
    const fromBrowser = parseReviewFeedParams({
      filter: search.get("filter"),
      sort: search.get("sort"),
    });
    expect(fromServer.filterFor).toBe(fromBrowser.filterFor);
    expect(fromServer.sortBy).toBe(ReviewsSortBy.TRENDING);
  });
});

describe("feed inputs", () => {
  const params = parseReviewFeedParams({});

  it("builds one query key for the server prefetch and the browser read", () => {
    // The server passes `undefined` for an absent filter. The browser may pass
    // `null`. Both must land on the same key.
    const server = courseFeedInput(
      { code: "IS215", slugs: undefined },
      parseReviewFeedParams({}),
    );
    const browser = courseFeedInput(
      { code: "IS215" },
      parseReviewFeedParams({ filter: null, sort: null }),
    );
    expect(hashKey([server])).toBe(hashKey([browser]));
  });

  it("keeps the key the same when the session resolves", () => {
    // The loader takes `isAuthenticated` from the server, so the input it
    // builds is a pure function of the props and the URL.
    const first = { ...homeFeedInput(params), ...MEMBER_FEED_INPUT };
    const second = { ...homeFeedInput(params), ...MEMBER_FEED_INPUT };
    expect(hashKey([first])).toBe(hashKey([second]));
  });

  it("adds the engagement flag only to the signed-in input", () => {
    expect(homeFeedInput(params)).not.toHaveProperty("includeEngagement");
    expect({ ...homeFeedInput(params), ...MEMBER_FEED_INPUT }).toMatchObject({
      includeEngagement: true,
    });
  });

  it("carries the scope of a professor feed", () => {
    expect(
      professorFeedInput({ slug: "yixin-cao", courseCodes: ["IS215"] }, params),
    ).toEqual({ slug: "yixin-cao", courseCodes: ["IS215"], ...params });
  });
});
