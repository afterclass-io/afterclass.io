import { describe, expect, it } from "vitest";
import {
  ReviewReactionType,
  ReviewType,
  UniversityAbbreviation,
} from "@/generated/prisma/enums";
import type { Review } from "@/common/types/reviews";
import {
  EMPTY_ENGAGEMENT,
  withReaction,
  withShare,
  withVote,
} from "./engagement";

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== null && typeof val === "object" && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

const baseReview: Review = {
  id: "rev-test-1",
  body: "Great module",
  tips: "Study hard",
  rating: 5,
  courseCode: "IS111",
  courseName: "Intro to Programming",
  username: "testuser",
  likeCount: 10,
  countEventViews: 42,
  createdAt: 1700000000000,
  reviewLabels: [],
  university: UniversityAbbreviation.SMU,
  reviewFor: ReviewType.COURSE,
};

describe("engagement reducers", () => {
  it("withVote(r, 1) from vote 0: likeCount + 1, viewerVote 1", () => {
    const r = deepFreeze({
      ...baseReview,
      likeCount: 5,
      engagement: {
        ...EMPTY_ENGAGEMENT,
        viewerVote: 0 as const,
      },
    });

    const updated = withVote(r, 1);
    expect(updated.likeCount).toBe(6);
    expect(updated.engagement?.viewerVote).toBe(1);
  });

  it("withVote(r, -1) from vote 1: likeCount - 2", () => {
    const r = deepFreeze({
      ...baseReview,
      likeCount: 10,
      engagement: {
        ...EMPTY_ENGAGEMENT,
        viewerVote: 1 as const,
      },
    });

    const updated = withVote(r, -1);
    expect(updated.likeCount).toBe(8);
    expect(updated.engagement?.viewerVote).toBe(-1);
  });

  it("withVote(r, 0) from vote 1: likeCount - 1", () => {
    const r = deepFreeze({
      ...baseReview,
      likeCount: 10,
      engagement: {
        ...EMPTY_ENGAGEMENT,
        viewerVote: 1 as const,
      },
    });

    const updated = withVote(r, 0);
    expect(updated.likeCount).toBe(9);
    expect(updated.engagement?.viewerVote).toBe(0);
  });

  it("withReaction replaces the old reaction: old count -1 (removed at 0), new count +1, viewerReaction set", () => {
    const r = deepFreeze({
      ...baseReview,
      engagement: {
        ...EMPTY_ENGAGEMENT,
        viewerReaction: ReviewReactionType.LIKE,
        reactionCounts: [
          { reaction: ReviewReactionType.LIKE, count: 1 },
          { reaction: ReviewReactionType.THANKFUL, count: 2 },
        ],
      },
    });

    const updated = withReaction(r, ReviewReactionType.SLAY);
    expect(updated.engagement?.viewerReaction).toBe(ReviewReactionType.SLAY);
    expect(updated.engagement?.reactionCounts).toEqual([
      { reaction: ReviewReactionType.THANKFUL, count: 2 },
      { reaction: ReviewReactionType.SLAY, count: 1 },
    ]);
  });

  it("withReaction decrements old count without removing when count > 1", () => {
    const r = deepFreeze({
      ...baseReview,
      engagement: {
        ...EMPTY_ENGAGEMENT,
        viewerReaction: ReviewReactionType.LIKE,
        reactionCounts: [{ reaction: ReviewReactionType.LIKE, count: 2 }],
      },
    });

    const updated = withReaction(r, ReviewReactionType.THANKFUL);
    expect(updated.engagement?.viewerReaction).toBe(
      ReviewReactionType.THANKFUL,
    );
    expect(updated.engagement?.reactionCounts).toEqual([
      { reaction: ReviewReactionType.LIKE, count: 1 },
      { reaction: ReviewReactionType.THANKFUL, count: 1 },
    ]);
  });

  it("withReaction(r, undefined) clears the reaction", () => {
    const r = deepFreeze({
      ...baseReview,
      engagement: {
        ...EMPTY_ENGAGEMENT,
        viewerReaction: ReviewReactionType.LIKE,
        reactionCounts: [
          { reaction: ReviewReactionType.LIKE, count: 1 },
          { reaction: ReviewReactionType.THANKFUL, count: 3 },
        ],
      },
    });

    const updated = withReaction(r, undefined);
    expect(updated.engagement?.viewerReaction).toBeNull();
    expect(updated.engagement?.reactionCounts).toEqual([
      { reaction: ReviewReactionType.THANKFUL, count: 3 },
    ]);
  });

  it("withShare adds 1 and does not mutate input", () => {
    const r = deepFreeze({
      ...baseReview,
      engagement: {
        ...EMPTY_ENGAGEMENT,
        shareCount: 4,
      },
    });

    const updated = withShare(r);
    expect(updated.engagement?.shareCount).toBe(5);
    expect(r.engagement?.shareCount).toBe(4);
  });
});
