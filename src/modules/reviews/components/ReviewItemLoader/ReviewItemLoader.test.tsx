// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

let mockSearchParams: URLSearchParams | null = null;

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/",
}));

vi.mock("react-intersection-observer", () => ({
  InView: () => null,
}));

vi.mock("../ReviewItem", () => ({
  ReviewItem: ({ review }: { review: { id: string } }) => (
    <div data-test="review" data-review-id={review.id} />
  ),
  ReviewItemSkeleton: () => <div data-test="review-skeleton" />,
}));

// Each reviews hook is a spy so the test can pin which procedure the loader
// selects for a given server-resolved session, and with which input.
vi.mock("@/common/tools/trpc/react", () => {
  const hook = () => ({ useSuspenseInfiniteQuery: vi.fn() });
  return {
    api: {
      reviews: {
        getAll: hook(),
        getAllProtected: hook(),
        getByCourseCode: hook(),
        getByCourseCodeProtected: hook(),
        getByProfSlug: hook(),
        getByProfSlugProtected: hook(),
      },
    },
  };
});

import { api } from "@/common/tools/trpc/react";

import { ReviewItemLoader } from "./ReviewItemLoader";

const hooks = {
  getAll: api.reviews.getAll.useSuspenseInfiniteQuery as unknown as Mock,
  getAllProtected: api.reviews.getAllProtected
    .useSuspenseInfiniteQuery as unknown as Mock,
  getByCourseCode: api.reviews.getByCourseCode
    .useSuspenseInfiniteQuery as unknown as Mock,
  getByCourseCodeProtected: api.reviews.getByCourseCodeProtected
    .useSuspenseInfiniteQuery as unknown as Mock,
  getByProfSlug: api.reviews.getByProfSlug
    .useSuspenseInfiniteQuery as unknown as Mock,
  getByProfSlugProtected: api.reviews.getByProfSlugProtected
    .useSuspenseInfiniteQuery as unknown as Mock,
};

let refetch: Mock;

beforeEach(() => {
  mockSearchParams = new URLSearchParams();
  refetch = vi.fn();
  for (const hook of Object.values(hooks)) {
    hook.mockReset();
    hook.mockReturnValue([
      { pages: [{ items: [{ id: "review-1" }] }] },
      {
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isPending: false,
        isRefetching: false,
        refetch,
      },
    ]);
  }
});

describe("ReviewItemLoader procedure selection", () => {
  it("uses the protected course procedure for a signed-in student", () => {
    render(
      <ReviewItemLoader
        variant="course"
        code="IS215"
        slugs={["ouh-eng-lieh"]}
        isAuthenticated
      />,
    );

    expect(hooks.getByCourseCodeProtected).toHaveBeenCalledTimes(1);
    expect(hooks.getByCourseCode).not.toHaveBeenCalled();
    expect(hooks.getByCourseCodeProtected.mock.calls[0]?.[0]).toEqual({
      code: "IS215",
      slugs: ["ouh-eng-lieh"],
      filterFor: "all",
      sortBy: "latest",
    });
  });

  it("uses the public home procedure for a signed-out visitor", () => {
    mockSearchParams = new URLSearchParams("filter=upvoted&sort=trending");

    render(<ReviewItemLoader variant="home" isAuthenticated={false} />);

    expect(hooks.getAllProtected).not.toHaveBeenCalled();
    expect(hooks.getAll.mock.calls[0]?.[0]).toEqual({
      filterFor: "upvoted",
      sortBy: "trending",
    });
  });

  it("keeps the professor query input stable across rerenders and never refetches", () => {
    const input = {
      variant: "professor" as const,
      slug: "ouh-eng-lieh",
      courseCodes: ["IS215"],
      isAuthenticated: true,
    };
    const { rerender } = render(<ReviewItemLoader {...input} />);
    const firstInput: unknown = hooks.getByProfSlugProtected.mock.calls[0]?.[0];

    rerender(<ReviewItemLoader {...input} />);

    expect(hooks.getByProfSlugProtected).toHaveBeenCalledTimes(2);
    expect(hooks.getByProfSlugProtected.mock.calls[1]?.[0]).toEqual(firstInput);
    expect(refetch).not.toHaveBeenCalled();
  });
});
