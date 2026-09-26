import { describe, expect, it } from "vitest";

import { ReviewsFilterFor, ReviewsSortBy } from "@/modules/reviews/types";

import { parseReviewParams } from "./parseReviewParams";

describe("parseReviewParams", () => {
  it("defaults to ALL/LATEST when no params are present", () => {
    expect(parseReviewParams(undefined)).toEqual({
      filterFor: ReviewsFilterFor.ALL,
      sortBy: ReviewsSortBy.LATEST,
    });
    expect(parseReviewParams({})).toEqual({
      filterFor: ReviewsFilterFor.ALL,
      sortBy: ReviewsSortBy.LATEST,
    });
  });

  it("parses valid params from a URLSearchParams source", () => {
    const params = new URLSearchParams("filter=upvoted&sort=trending");
    expect(parseReviewParams(params)).toEqual({
      filterFor: ReviewsFilterFor.UPVOTED,
      sortBy: ReviewsSortBy.TRENDING,
    });
  });

  it("parses valid params from a Next searchParams record", () => {
    expect(parseReviewParams({ filter: "upvoted", sort: "top_votes" })).toEqual(
      {
        filterFor: ReviewsFilterFor.UPVOTED,
        sortBy: ReviewsSortBy.TOP_VOTES,
      },
    );
  });

  it("takes the first value when a record repeats a param", () => {
    expect(parseReviewParams({ filter: ["upvoted", "all"] })).toEqual({
      filterFor: ReviewsFilterFor.UPVOTED,
      sortBy: ReviewsSortBy.LATEST,
    });
  });

  it("rejects garbage back to the defaults", () => {
    expect(
      parseReviewParams(new URLSearchParams("filter=nope&sort=whatever")),
    ).toEqual({
      filterFor: ReviewsFilterFor.ALL,
      sortBy: ReviewsSortBy.LATEST,
    });
    expect(parseReviewParams({ filter: "", sort: "123" })).toEqual({
      filterFor: ReviewsFilterFor.ALL,
      sortBy: ReviewsSortBy.LATEST,
    });
  });
});
