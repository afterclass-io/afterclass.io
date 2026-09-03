import { getQueryKey } from "@trpc/react-query";
import { describe, expect, it } from "vitest";

import { api } from "@/common/tools/trpc/react";
import { ReviewsFilterFor, ReviewsSortBy } from "@/modules/reviews/types";
import { getReviewFeedParams, getReviewFeedProcedure } from "./reviewFeed";

// Regression test for #516: the review feed used to fetch under the public
// procedure's query key while the session was loading, then switch to the
// protected procedure's (cold) key once the session resolved — two sequential
// round trips for signed-in students. The fix resolves the session on the
// server and prefetches the procedure the client will actually use for that
// session state. The contract is the query key, not the number of network
// calls (the former is testable, the latter is timing).

const input = {
  filterFor: ReviewsFilterFor.ALL,
  sortBy: ReviewsSortBy.LATEST,
};

describe("getReviewFeedProcedure", () => {
  it("maps each variant to its session-specific procedure (authed → protected, anon → public)", () => {
    expect(getReviewFeedProcedure("home", false)).toBe("getAll");
    expect(getReviewFeedProcedure("home", true)).toBe("getAllProtected");
    expect(getReviewFeedProcedure("course", false)).toBe("getByCourseCode");
    expect(getReviewFeedProcedure("course", true)).toBe(
      "getByCourseCodeProtected",
    );
    expect(getReviewFeedProcedure("professor", false)).toBe("getByProfSlug");
    expect(getReviewFeedProcedure("professor", true)).toBe(
      "getByProfSlugProtected",
    );
  });
});

describe("review feed query key stability (#516)", () => {
  const cases = [
    {
      variant: "home",
      isAuthed: false,
      proc: "getAll",
      extra: {},
    },
    {
      variant: "home",
      isAuthed: true,
      proc: "getAllProtected",
      extra: {},
    },
    {
      variant: "course",
      isAuthed: false,
      proc: "getByCourseCode",
      extra: { code: "CS101" },
    },
    {
      variant: "course",
      isAuthed: true,
      proc: "getByCourseCodeProtected",
      extra: { code: "CS101" },
    },
    {
      variant: "professor",
      isAuthed: false,
      proc: "getByProfSlug",
      extra: { slug: "dr-x" },
    },
    {
      variant: "professor",
      isAuthed: true,
      proc: "getByProfSlugProtected",
      extra: { slug: "dr-x" },
    },
  ] as const;

  it.each(cases)(
    "server prefetch and client hook share one key for $variant isAuthed=$isAuthed",
    ({ variant, isAuthed, proc, extra }) => {
      // The server page prefetches the procedure chosen for the resolved
      // session state; the client must request the same one after hydration,
      // or the prefetch lands on a key the client abandons (#516).
      expect(getReviewFeedProcedure(variant, isAuthed)).toBe(proc);
      // Both sides store/request this exact infinite-query key: procedure
      // path + input + infinite type.
      expect(
        getQueryKey(api.reviews[proc], { ...input, ...extra }, "infinite"),
      ).toEqual([
        ["reviews", proc],
        { input: { ...input, ...extra }, type: "infinite" },
      ]);
    },
  );

  it("keeps the optional filter inputs (slugs/courseCodes) out of the key when unset", () => {
    // The loader passes `slugs: undefined` when no professor filter is set;
    // the page prefetches with the same shape. Both must hash to the same key
    // as an input that omits the field entirely.
    const withUndefined = getQueryKey(
      api.reviews.getByCourseCode,
      { ...input, code: "CS101", slugs: undefined },
      "infinite",
    );
    const without = getQueryKey(
      api.reviews.getByCourseCode,
      { ...input, code: "CS101" },
      "infinite",
    );
    expect(withUndefined).toEqual(without);
  });
});

describe("getReviewFeedParams", () => {
  it("derives identical input from the server and client search-param shapes", () => {
    const raw = new URLSearchParams("filter=upvoted&sort=trending");
    const serverShape = Object.fromEntries(raw); // { filter: "upvoted", sort: "trending" }

    expect(getReviewFeedParams(raw)).toEqual(getReviewFeedParams(serverShape));
    expect(getReviewFeedParams(raw)).toEqual({
      filterFor: ReviewsFilterFor.UPVOTED,
      sortBy: ReviewsSortBy.TRENDING,
    });
  });

  it("defaults to ALL/LATEST on missing or invalid params", () => {
    expect(getReviewFeedParams(new URLSearchParams())).toEqual(input);
    expect(getReviewFeedParams({ filter: "bogus", sort: "bogus" })).toEqual(
      input,
    );
    expect(getReviewFeedParams(undefined)).toEqual(input);
  });
});
