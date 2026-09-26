import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReviewsFilterFor, ReviewsSortBy } from "@/modules/reviews/types";

const mocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  getAllProtected: vi.fn(),
  getByCourseCode: vi.fn(),
  getByCourseCodeProtected: vi.fn(),
  getByProfSlug: vi.fn(),
  getByProfSlugProtected: vi.fn(),
}));

vi.mock("@/common/tools/trpc/server", () => ({
  api: {
    reviews: {
      getAll: { prefetchInfinite: mocks.getAll },
      getAllProtected: { prefetchInfinite: mocks.getAllProtected },
      getByCourseCode: { prefetchInfinite: mocks.getByCourseCode },
      getByCourseCodeProtected: {
        prefetchInfinite: mocks.getByCourseCodeProtected,
      },
      getByProfSlug: { prefetchInfinite: mocks.getByProfSlug },
      getByProfSlugProtected: {
        prefetchInfinite: mocks.getByProfSlugProtected,
      },
    },
  },
}));

import { prefetchReviewFeed } from "./prefetchReviewFeed";

const params = {
  filterFor: ReviewsFilterFor.ALL,
  sortBy: ReviewsSortBy.LATEST,
};

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
});

describe("prefetchReviewFeed", () => {
  it("prefetches the protected home procedure with the loader's input", async () => {
    await prefetchReviewFeed({
      variant: "home",
      isAuthenticated: true,
      ...params,
    });

    expect(mocks.getAllProtected).toHaveBeenCalledWith({
      filterFor: "all",
      sortBy: "latest",
    });
    expect(mocks.getAll).not.toHaveBeenCalled();
  });

  it("prefetches the public course procedure, preserving absent filters as undefined", async () => {
    await prefetchReviewFeed({
      variant: "course",
      isAuthenticated: false,
      code: "IS215",
      slugs: undefined,
      ...params,
    });

    expect(mocks.getByCourseCode).toHaveBeenCalledWith({
      code: "IS215",
      slugs: undefined,
      filterFor: "all",
      sortBy: "latest",
    });
    expect(mocks.getByCourseCodeProtected).not.toHaveBeenCalled();
  });

  it("prefetches the protected professor procedure", async () => {
    await prefetchReviewFeed({
      variant: "professor",
      isAuthenticated: true,
      slug: "ouh-eng-lieh",
      courseCodes: ["IS215"],
      ...params,
    });

    expect(mocks.getByProfSlugProtected).toHaveBeenCalledWith({
      slug: "ouh-eng-lieh",
      courseCodes: ["IS215"],
      filterFor: "all",
      sortBy: "latest",
    });
    expect(mocks.getByProfSlug).not.toHaveBeenCalled();
  });
});
