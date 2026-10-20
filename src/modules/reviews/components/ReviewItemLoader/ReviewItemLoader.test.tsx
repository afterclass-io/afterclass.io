// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

type Page = { items: { id: string }[]; nextCursor?: string };

type MockState = {
  search: string;
  sessionStatus: "loading" | "authenticated";
  publicQuery: Mock;
  memberQuery: Mock;
  refetch: Mock;
  pages: Page[];
  hasNextPage: boolean;
};

const m = vi.hoisted((): MockState => ({
  search: "",
  sessionStatus: "loading",
  publicQuery: vi.fn(),
  memberQuery: vi.fn(),
  refetch: vi.fn(),
  pages: [],
  hasNextPage: false,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(m.search),
  usePathname: () => "/",
}));
// The loader must not read the client session: that was the cause of the
// second fetch. If it does, this stand-in changes under it.
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: m.sessionStatus === "authenticated" ? { user: {} } : null,
    status: m.sessionStatus,
  }),
}));
vi.mock("@/common/tools/trpc/react", () => {
  const result = () => [
    { pages: m.pages },
    { fetchNextPage: vi.fn(), hasNextPage: m.hasNextPage, refetch: m.refetch },
  ];
  return {
    api: {
      reviews: {
        getAll: {
          useSuspenseInfiniteQuery: (...args: unknown[]) => {
            m.publicQuery(...args);
            return result();
          },
        },
        getAllProtected: {
          useSuspenseInfiniteQuery: (...args: unknown[]) => {
            m.memberQuery(...args);
            return result();
          },
        },
      },
    },
  };
});
vi.mock("../ReviewItem", () => ({
  ReviewItem: ({ review }: { review: { id: string } }) => (
    <div data-testid="review">{review.id}</div>
  ),
}));
vi.mock("@/common/components/progress-link", () => ({
  ProgressLink: () => <a href="/submit">writing one</a>,
}));

import { ReviewItemLoader } from "./ReviewItemLoader";

beforeEach(() => {
  vi.clearAllMocks();
  m.search = "";
  m.sessionStatus = "loading";
  m.pages = [{ items: [{ id: "r1" }, { id: "r2" }] }];
  m.hasNextPage = false;
});

describe("ReviewItemLoader", () => {
  it("reads the signed-in procedure from the first render, before the client session resolves", () => {
    const { rerender } = render(
      <ReviewItemLoader variant="home" isAuthenticated />,
    );
    m.sessionStatus = "authenticated";
    rerender(<ReviewItemLoader variant="home" isAuthenticated />);

    expect(m.publicQuery).not.toHaveBeenCalled();
    expect(m.memberQuery).toHaveBeenCalledTimes(2);
    const [firstInput] = m.memberQuery.mock.calls[0] as [unknown];
    const [secondInput] = m.memberQuery.mock.calls[1] as [unknown];
    expect(firstInput).toEqual({
      filterFor: "all",
      sortBy: "latest",
      includeEngagement: true,
    });
    // Same input before and after the session resolves: one query key.
    expect(secondInput).toEqual(firstInput);
  });

  it("reads the public procedure for a signed-out viewer", () => {
    render(<ReviewItemLoader variant="home" isAuthenticated={false} />);

    expect(m.memberQuery).not.toHaveBeenCalled();
    expect(m.publicQuery).toHaveBeenCalledWith(
      { filterFor: "all", sortBy: "latest" },
      expect.anything(),
    );
    expect(screen.getAllByTestId("review")).toHaveLength(2);
  });

  it("lets a signed-out viewer load more pages", () => {
    // jsdom has no IntersectionObserver; the sentinel only needs to mount.
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );
    m.hasNextPage = true;
    const { container } = render(
      <ReviewItemLoader variant="home" isAuthenticated={false} />,
    );
    expect(
      container.querySelector('[data-test="review-load-more-sentinel"]'),
    ).not.toBeNull();
  });

  it("puts the filter and sort from the URL in the query input", () => {
    m.search = "filter=upvoted&sort=top_votes";
    render(<ReviewItemLoader variant="home" isAuthenticated />);

    expect(m.memberQuery).toHaveBeenCalledWith(
      { filterFor: "upvoted", sortBy: "top_votes", includeEngagement: true },
      expect.anything(),
    );
  });

  it("does not refetch on mount or when the search params change", () => {
    const { rerender } = render(
      <ReviewItemLoader variant="home" isAuthenticated />,
    );
    m.search = "sort=trending";
    rerender(<ReviewItemLoader variant="home" isAuthenticated />);

    // The sort is a query-key input, so the query library fetches on its own.
    expect(m.refetch).not.toHaveBeenCalled();
  });

  it("shows reviews to a signed-in viewer on the first paint", () => {
    render(<ReviewItemLoader variant="home" isAuthenticated />);
    expect(screen.getAllByTestId("review")).toHaveLength(2);
  });
});
