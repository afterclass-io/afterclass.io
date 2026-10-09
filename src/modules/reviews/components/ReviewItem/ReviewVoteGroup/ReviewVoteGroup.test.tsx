// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReviewType, UniversityAbbreviation } from "@/generated/prisma/enums";
import type { Review } from "@/common/types/reviews";
import { ReviewVoteGroup } from "./ReviewVoteGroup";

vi.mock("@/common/tools/trpc/react", () => ({
  api: {
    useUtils: () => ({}),
    reviewEvents: {
      track: { useMutation: () => ({ mutate: vi.fn() }) },
    },
    reviewVotes: {
      count: {
        useQuery: () => {
          throw new Error("reviewVotes.count.useQuery should not be called");
        },
      },
      getByUser: {
        useQuery: () => {
          throw new Error(
            "reviewVotes.getByUser.useQuery should not be called",
          );
        },
      },
      voteOrUnvote: { useMutation: () => ({ mutate: vi.fn() }) },
    },
  },
  getQueryClient: () => undefined,
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "authenticated", data: { user: { id: "u1" } } }),
}));

vi.mock("@/common/hooks", () => ({
  useEdgeConfigs: () => ({
    enableReviewEventsTracking: false,
  }),
}));

const baseReview: Review = {
  id: "rev-test-vote",
  body: "test body",
  tips: "",
  rating: 5,
  courseCode: "IS111",
  courseName: "Intro to Programming",
  username: "testuser",
  likeCount: 42,
  countEventViews: 100,
  createdAt: 1700000000000,
  university: UniversityAbbreviation.SMU,
  reviewFor: ReviewType.COURSE,
  reviewLabels: [],
};

describe("ReviewVoteGroup", () => {
  it("renders likeCount and viewer upvoted state from props without querying", () => {
    const review: Review = {
      ...baseReview,
      likeCount: 42,
      engagement: {
        viewerVote: 1,
        viewerReaction: null,
        reactionCounts: [],
        shareCount: 0,
      },
    };

    const { container } = render(<ReviewVoteGroup review={review} />);

    const upvoteButton = screen.getByRole("button", { name: /upvote/i });
    expect(upvoteButton).toHaveAttribute("data-voted", "true");

    const voteGroupContainer = container.querySelector("[data-vote-count]");
    expect(voteGroupContainer).toHaveAttribute("data-vote-count", "42");
    expect(voteGroupContainer).toHaveAttribute("data-voted", "true");
  });

  it("renders likeCount and downvoted state from props", () => {
    const review: Review = {
      ...baseReview,
      likeCount: 15,
      engagement: {
        viewerVote: -1,
        viewerReaction: null,
        reactionCounts: [],
        shareCount: 0,
      },
    };

    const { container } = render(<ReviewVoteGroup review={review} />);

    const downvoteButton = screen.getByRole("button", { name: /downvote/i });
    expect(downvoteButton).toHaveAttribute("data-voted", "true");

    const voteGroupContainer = container.querySelector("[data-vote-count]");
    expect(voteGroupContainer).toHaveAttribute("data-vote-count", "15");
  });

  it("renders default 0 viewer vote when engagement is missing", () => {
    const review: Review = {
      ...baseReview,
      likeCount: 7,
    };

    const { container } = render(<ReviewVoteGroup review={review} />);

    const upvoteButton = screen.getByRole("button", { name: /upvote/i });
    const downvoteButton = screen.getByRole("button", { name: /downvote/i });
    expect(upvoteButton).toHaveAttribute("data-voted", "false");
    expect(downvoteButton).toHaveAttribute("data-voted", "false");

    const voteGroupContainer = container.querySelector("[data-vote-count]");
    expect(voteGroupContainer).toHaveAttribute("data-vote-count", "7");
    expect(voteGroupContainer).toHaveAttribute("data-voted", "false");
  });
});
