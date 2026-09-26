import { describe, expect, it } from "vitest";

import { ReviewsFilterFor, ReviewsSortBy } from "@/modules/reviews/types";

import {
  buildCourseReviewInput,
  buildHomeReviewInput,
  buildProfessorReviewInput,
  infiniteReviewQueryOptions,
} from "./reviewFeedInput";

const params = {
  filterFor: ReviewsFilterFor.ALL,
  sortBy: ReviewsSortBy.LATEST,
};

describe("review feed input builders", () => {
  it("builds the home input from filter/sort only", () => {
    expect(buildHomeReviewInput(params)).toEqual({
      filterFor: "all",
      sortBy: "latest",
    });
  });

  it("keeps an absent course-professor filter undefined, not empty", () => {
    expect(
      buildCourseReviewInput({ code: "IS215", slugs: undefined, ...params }),
    ).toEqual({
      code: "IS215",
      slugs: undefined,
      filterFor: "all",
      sortBy: "latest",
    });
  });

  it("keeps an absent professor-course filter undefined, not empty", () => {
    expect(
      buildProfessorReviewInput({ slug: "ouh-eng-lieh", ...params }),
    ).toEqual({
      slug: "ouh-eng-lieh",
      courseCodes: undefined,
      filterFor: "all",
      sortBy: "latest",
    });
  });

  it("exposes one shared next-page cursor reader", () => {
    expect(
      infiniteReviewQueryOptions.getNextPageParam({ nextCursor: "c1" }),
    ).toBe("c1");
    expect(infiniteReviewQueryOptions.getNextPageParam({})).toBeUndefined();
  });
});
