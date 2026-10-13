import { describe, expect, it, vi } from "vitest";
import { type PrismaClient } from "@/generated/prisma/client";
import { ReviewReactionType } from "@/generated/prisma/enums";
import { loadReviewEngagement, reviewEngagementSchema } from "./engagement";

describe("reviews engagement (engagement.ts)", () => {
  it("empty reviewIds makes zero db calls and returns {}", async () => {
    const db = {
      get reviewVotes() {
        throw new Error("reviewVotes accessed");
      },
      get reviewReactions() {
        throw new Error("reviewReactions accessed");
      },
      get reviewEvents() {
        throw new Error("reviewEvents accessed");
      },
    } as unknown as PrismaClient;

    const result = await loadReviewEngagement(db, "u1", []);
    expect(result).toEqual({});
  });

  it("calls reviewReactions.groupBy and reviewEvents.groupBy with de-duplicated ids and expected shapes", async () => {
    const reviewVotesFindMany = vi.fn().mockResolvedValue([]);
    const reviewReactionsGroupBy = vi.fn().mockResolvedValue([]);
    const reviewReactionsFindMany = vi.fn().mockResolvedValue([]);
    const reviewEventsGroupBy = vi.fn().mockResolvedValue([]);

    const db = {
      reviewVotes: { findMany: reviewVotesFindMany },
      reviewReactions: {
        groupBy: reviewReactionsGroupBy,
        findMany: reviewReactionsFindMany,
      },
      reviewEvents: { groupBy: reviewEventsGroupBy },
    } as unknown as PrismaClient;

    const result = await loadReviewEngagement(db, "u1", ["r1", "r1", "r2"]);

    expect(reviewReactionsGroupBy).toHaveBeenCalledTimes(1);
    expect(reviewReactionsGroupBy).toHaveBeenCalledWith({
      by: ["reviewId", "reaction"],
      where: { reviewId: { in: ["r1", "r2"] } },
      _count: { _all: true },
    });

    expect(reviewEventsGroupBy).toHaveBeenCalledTimes(1);
    expect(reviewEventsGroupBy).toHaveBeenCalledWith({
      by: ["reviewId"],
      where: { reviewId: { in: ["r1", "r2"] }, eventType: "SHARE" },
      _count: { _all: true },
    });

    expect(reviewVotesFindMany).toHaveBeenCalledWith({
      where: { voterId: "u1", reviewId: { in: ["r1", "r2"] } },
      select: { reviewId: true, weight: true },
    });

    expect(reviewReactionsFindMany).toHaveBeenCalledWith({
      where: { reactingUserId: "u1", reviewId: { in: ["r1", "r2"] } },
      select: { reviewId: true, reaction: true },
    });

    expect(Object.keys(result).sort()).toEqual(["r1", "r2"]);
  });

  it("every requested id appears in the result with EMPTY_ENGAGEMENT shape when no row matches", async () => {
    const db = {
      reviewVotes: { findMany: vi.fn().mockResolvedValue([]) },
      reviewReactions: {
        groupBy: vi.fn().mockResolvedValue([]),
        findMany: vi.fn().mockResolvedValue([]),
      },
      reviewEvents: { groupBy: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;

    const result = await loadReviewEngagement(db, "u1", [
      "r-empty-1",
      "r-empty-2",
    ]);

    expect(result["r-empty-1"]).toEqual({
      viewerVote: 0,
      viewerReaction: null,
      reactionCounts: [],
      shareCount: 0,
    });
    expect(result["r-empty-2"]).toEqual({
      viewerVote: 0,
      viewerReaction: null,
      reactionCounts: [],
      shareCount: 0,
    });
  });

  it("reactionCounts follows enum declaration order and omits zero counts", async () => {
    const db = {
      reviewVotes: { findMany: vi.fn().mockResolvedValue([]) },
      reviewReactions: {
        groupBy: vi.fn().mockResolvedValue([
          { reviewId: "r1", reaction: "SHOCKED", _count: { _all: 2 } },
          { reviewId: "r1", reaction: "LIKE", _count: { _all: 5 } },
          { reviewId: "r1", reaction: "FUNNY", _count: { _all: 1 } },
        ]),
        findMany: vi.fn().mockResolvedValue([]),
      },
      reviewEvents: { groupBy: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;

    const result = await loadReviewEngagement(db, "u1", ["r1"]);
    const counts = result.r1!.reactionCounts;

    // Declaration order in generated enums: LIKE, THANKFUL, SLAY, FUNNY, CRYING, SHOCKED
    expect(counts).toEqual([
      { reaction: "LIKE", count: 5 },
      { reaction: "FUNNY", count: 1 },
      { reaction: "SHOCKED", count: 2 },
    ]);
  });

  it("every value passes reviewEngagementSchema.parse and rejects extra keys like reactingUserId", () => {
    const valid = {
      viewerVote: 1 as const,
      viewerReaction: ReviewReactionType.LIKE,
      reactionCounts: [{ reaction: ReviewReactionType.LIKE, count: 2 }],
      shareCount: 3,
    };
    expect(() => reviewEngagementSchema.parse(valid)).not.toThrow();

    const withReactingUserId = {
      ...valid,
      reactingUserId: "u1",
    };
    expect(() => reviewEngagementSchema.parse(withReactingUserId)).toThrow();

    const withVoterId = {
      ...valid,
      voterId: "u1",
    };
    expect(() => reviewEngagementSchema.parse(withVoterId)).toThrow();
  });

  it("JSON.stringify(result) does not contain reactingUserId, even when mock rows include it", async () => {
    const db = {
      reviewVotes: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { reviewId: "r1", weight: 1, voterId: "secret-voter" },
          ]),
      },
      reviewReactions: {
        groupBy: vi
          .fn()
          .mockResolvedValue([
            { reviewId: "r1", reaction: "LIKE", _count: { _all: 1 } },
          ]),
        findMany: vi.fn().mockResolvedValue([
          {
            reviewId: "r1",
            reaction: "LIKE",
            reactingUserId: "secret-reacting-user",
          },
        ]),
      },
      reviewEvents: {
        groupBy: vi
          .fn()
          .mockResolvedValue([{ reviewId: "r1", _count: { _all: 1 } }]),
      },
    } as unknown as PrismaClient;

    const result = await loadReviewEngagement(db, "secret-reacting-user", [
      "r1",
    ]);
    const json = JSON.stringify(result);

    expect(json).not.toContain("reactingUserId");
    expect(json).not.toContain("secret-reacting-user");
    expect(json).not.toContain("voterId");
    expect(json).not.toContain("secret-voter");

    expect(reviewEngagementSchema.parse(result.r1)).toEqual({
      viewerVote: 1,
      viewerReaction: "LIKE",
      reactionCounts: [{ reaction: "LIKE", count: 1 }],
      shareCount: 1,
    });
  });
});
