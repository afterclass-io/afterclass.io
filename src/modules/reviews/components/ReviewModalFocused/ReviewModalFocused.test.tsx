// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { useMemo, useState } from "react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

type MockState = {
  search: string;
  pathname: string;
  sessionStatus: "authenticated" | "unauthenticated" | "loading";
  query: { status: string; data?: unknown };
  push: Mock;
  router: { push: Mock };
  useQuery: Mock;
  toastError: Mock;
};

const m = vi.hoisted((): MockState => ({
  search: "review_id=r1",
  pathname: "/course/COR-IS1702",
  sessionStatus: "authenticated",
  query: { status: "success", data: { id: "r1" } },
  push: vi.fn(),
  router: { push: vi.fn() },
  useQuery: vi.fn(),
  toastError: vi.fn(),
}));

// The real Next hooks are memoised; useMemo here keeps the hook list honest.
vi.mock("next/navigation", () => ({
  useSearchParams: () => {
    const search = m.search;
    return useMemo(() => new URLSearchParams(search), [search]);
  },
  usePathname: () => m.pathname,
  useRouter: () => m.router,
}));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: m.sessionStatus }),
}));
vi.mock("sonner", () => ({ toast: { error: m.toastError } }));
vi.mock("../ReviewItem/ReviewModal", () => ({
  ReviewModal: () => <div data-testid="review-modal" />,
}));
// The real useQuery is built on hooks; the stand-in must use one too, or the
// test cannot see a hook-order change.
vi.mock("@/common/tools/trpc/react", () => ({
  api: {
    reviews: {
      getById: {
        useQuery: (...args: unknown[]) => {
          useState(0);
          m.useQuery(...args);
          return m.query;
        },
      },
    },
  },
}));

import { ReviewModalFocused } from "./ReviewModalFocused";

m.router = { push: m.push };

describe("ReviewModalFocused", () => {
  beforeEach(() => {
    m.search = "review_id=r1";
    m.pathname = "/course/COR-IS1702";
    m.sessionStatus = "authenticated";
    m.query = { status: "success", data: { id: "r1" } };
    m.push.mockReset();
    m.useQuery.mockReset();
    m.toastError.mockReset();
  });

  it("renders the review modal for a signed-in user", () => {
    const { getByTestId } = render(<ReviewModalFocused variant="course" />);
    expect(getByTestId("review-modal")).toBeTruthy();
  });

  it("keeps the same hooks when review_id appears and disappears", () => {
    const { rerender, queryByTestId } = render(
      <ReviewModalFocused variant="course" />,
    );
    m.search = "";
    expect(() =>
      rerender(<ReviewModalFocused variant="course" />),
    ).not.toThrow();
    expect(queryByTestId("review-modal")).toBeNull();
    m.search = "review_id=r2";
    expect(() =>
      rerender(<ReviewModalFocused variant="course" />),
    ).not.toThrow();
  });

  it("keeps the same hooks when the session finishes loading", () => {
    m.sessionStatus = "loading";
    const { rerender } = render(<ReviewModalFocused variant="course" />);
    m.sessionStatus = "authenticated";
    expect(() =>
      rerender(<ReviewModalFocused variant="course" />),
    ).not.toThrow();
  });

  it("sends a signed-out visitor to login once, with an encoded relative callback", () => {
    m.sessionStatus = "unauthenticated";
    const { rerender } = render(<ReviewModalFocused variant="course" />);
    rerender(<ReviewModalFocused variant="course" />);
    rerender(<ReviewModalFocused variant="course" />);

    expect(m.push).toHaveBeenCalledTimes(1);
    expect(m.push).toHaveBeenCalledWith(
      `/account/auth/login?callbackUrl=${encodeURIComponent("/course/COR-IS1702?review_id=r1")}`,
    );
  });

  it("does not fetch the review for a signed-out visitor", () => {
    m.sessionStatus = "unauthenticated";
    render(<ReviewModalFocused variant="course" />);
    for (const call of m.useQuery.mock.calls) {
      expect(call[1]).toMatchObject({ enabled: false });
    }
  });

  it("does nothing without a review_id", () => {
    m.search = "";
    m.sessionStatus = "unauthenticated";
    const { container } = render(<ReviewModalFocused variant="course" />);
    expect(container.innerHTML).toBe("");
    expect(m.push).not.toHaveBeenCalled();
  });

  it("reports a missing review once per error", () => {
    m.query = { status: "error" };
    const { rerender } = render(<ReviewModalFocused variant="course" />);
    rerender(<ReviewModalFocused variant="course" />);
    expect(m.toastError).toHaveBeenCalledTimes(1);
    expect(m.toastError).toHaveBeenCalledWith(
      "Review not found",
      expect.objectContaining({ id: "r1" }),
    );
  });
});
