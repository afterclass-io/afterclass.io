// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReviewType, UniversityAbbreviation } from "@/generated/prisma/enums";
import type { Review } from "@/common/types/reviews";

vi.mock("@/common/tools/trpc/react", () => ({
  api: {
    useUtils: () => ({
      reviewVotes: {
        getByUser: { getData: vi.fn(), setData: vi.fn(), invalidate: vi.fn() },
        count: { getData: vi.fn(), setData: vi.fn(), invalidate: vi.fn() },
      },
    }),
    reviewEvents: {
      track: { useMutation: () => ({ mutate: vi.fn() }) },
      countEvent: { useQuery: () => ({ data: 0, isPending: false }) },
    },
    reviewVotes: {
      getByUser: {
        useQuery: () => ({ data: null }),
        getData: vi.fn(),
        setData: vi.fn(),
      },
      count: {
        useQuery: () => ({ data: 0 }),
        invalidate: vi.fn(),
        setData: vi.fn(),
      },
      voteOrUnvote: { useMutation: () => ({ mutate: vi.fn() }) },
    },
    reviewReactions: {
      getByUser: { useQuery: () => ({ data: [] }) },
      count: { useQuery: () => ({ data: [] }) },
      reactOrUnreact: { useMutation: () => ({ mutate: vi.fn() }) },
    },
    moderation: {
      report: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "unauthenticated", data: null }),
}));

vi.mock("@/common/hooks", () => ({
  useEdgeConfigs: () => ({
    enableContentModeration: false,
    enableReviewReactions: false,
    enableReviewEventsTracking: false,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/course/IS111",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/common/providers/ProgressProvider", () => ({
  useProgress: () => ({
    start: vi.fn(),
    done: vi.fn(),
  }),
}));

import { ReviewModal } from "./ReviewModal";

const review: Review = {
  id: "rv-focus-1",
  body: "Clear lectures and fair grading",
  tips: "Attend every class",
  rating: 4,
  courseCode: "IS111",
  courseName: "Intro to Programming",
  username: "student1",
  likeCount: 2,
  countEventViews: 10,
  createdAt: Date.now(),
  reviewLabels: [],
  university: UniversityAbbreviation.SMU,
  reviewFor: ReviewType.PROFESSOR,
};

describe("ReviewModal focus", () => {
  it("moves focus to the dialog container when it opens", async () => {
    render(<ReviewModal review={review} variant="professor" defaultOpen />);

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    expect(dialog).toHaveAttribute("data-test", "review-modal");
  });

  it("does not focus the close button on open", async () => {
    render(<ReviewModal review={review} variant="professor" defaultOpen />);

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    expect(screen.getByRole("button", { name: "Close" })).not.toHaveFocus();
  });
});
