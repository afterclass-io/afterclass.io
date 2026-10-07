// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReviewType, UniversityAbbreviation } from "@/generated/prisma/enums";
import type { Review } from "@/modules/reviews/types";

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
      getByUser: { useQuery: () => ({ data: null }), getData: vi.fn(), setData: vi.fn() },
      count: { useQuery: () => ({ data: 0 }), invalidate: vi.fn(), setData: vi.fn() },
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

const mockReview: Review = {
  id: "rv-modal-1",
  body: "This professor is shit at teaching",
  tips: "Avoid this class",
  rating: 1,
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

describe("ReviewModal", () => {
  it("renders blocked profanity in modal body as asterisks", () => {
    render(
      <ReviewModal
        review={mockReview}
        variant="professor"
        defaultOpen={true}
      />,
    );
    expect(
      screen.getByText("This professor is **** at teaching"),
    ).toBeInTheDocument();
  });

  it("leaves clean review body text unchanged in modal body", () => {
    render(
      <ReviewModal
        review={{ ...mockReview, body: "Great professor and clear lectures" }}
        variant="professor"
        defaultOpen={true}
      />,
    );
    expect(
      screen.getByText("Great professor and clear lectures"),
    ).toBeInTheDocument();
  });
});
