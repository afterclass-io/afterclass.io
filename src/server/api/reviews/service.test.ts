import { describe, expect, it, vi } from "vitest";
import { type PrismaClient } from "@/generated/prisma/client";
import { ReviewType } from "@/generated/prisma/enums";
import { ReviewsFilterFor, ReviewsSortBy } from "@/common/types/reviews";
import { TRPCError } from "@trpc/server";
import { PUBLIC_REVIEW_FIELDS } from "./constants";
import {
  buildReviewWhere,
  getReviewById,
  listReviews,
  reviewPageInput,
  toMemberReview,
} from "./service";

import memberReviewRow from "./fixtures/member-review-row.json";
import expectedKeys from "./fixtures/member-review-keys.json";

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "r1",
    rating: 5,
    body: "real body",
    tips: "real tips",
    countEventViews: 3,
    countVotes: 7,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    reviewedUniversityId: 1,
    reviewedProfessorId: "p1",
    reviewedCourseId: "c1",
    reviewedCourse: { code: "CS101", name: "Intro to CS" },
    reviewer: { username: "alice" },
    reviewLabels: [{ label: { name: "INTERESTING" } }],
    reviewedProfessor: { name: "Dr X", slug: "dr-x" },
    reviewedUniversity: { abbrv: "SMU" },
    ...overrides,
  };
}

function makePage(
  overrides: Partial<Parameters<typeof listReviews>[1]["page"]> = {},
) {
  return {
    filterFor: ReviewsFilterFor.ALL,
    sortBy: ReviewsSortBy.LATEST,
    limit: 10,
    skip: 0,
    ...overrides,
  };
}

describe("review service (service.ts)", () => {
  describe("buildReviewWhere", () => {
    it("returns the exact key set for 'all' scope", () => {
      const where = buildReviewWhere(
        {
          kind: "all",
          universityId: 1,
          courseId: "c1",
          profId: "p1",
        },
        ReviewsFilterFor.ALL,
        { kind: "public" },
      );

      expect(where).toEqual({
        reviewedUniversityId: 1,
        reviewedCourseId: "c1",
        reviewedProfessorId: "p1",
      });
    });

    it("returns the exact key set for 'course' scope with profSlugs", () => {
      const where = buildReviewWhere(
        {
          kind: "course",
          code: "CS101",
          profSlugs: ["dr-x"],
        },
        ReviewsFilterFor.ALL,
        { kind: "public" },
      );

      expect(where).toEqual({
        reviewedCourse: { code: "CS101" },
        reviewedProfessor: { slug: { in: ["dr-x"] } },
      });
    });

    it("omits reviewedProfessor condition when profSlugs is undefined", () => {
      const where = buildReviewWhere(
        {
          kind: "course",
          code: "CS101",
          profSlugs: undefined,
        },
        ReviewsFilterFor.ALL,
        { kind: "public" },
      );

      expect(where).toEqual({
        reviewedCourse: { code: "CS101" },
      });
      expect("reviewedProfessor" in where).toBe(false);
    });

    it("returns the exact key set for 'professor' scope", () => {
      const where = buildReviewWhere(
        {
          kind: "professor",
          slug: "dr-x",
          universityId: 1,
          courseCodes: ["CS101"],
        },
        ReviewsFilterFor.ALL,
        { kind: "public" },
      );

      expect(where).toEqual({
        reviewedUniversityId: 1,
        reviewedCourse: { code: { in: ["CS101"] } },
        reviewedProfessor: { slug: "dr-x" },
      });
    });

    it("public viewer plus UPVOTED has no votes key in where", () => {
      const where = buildReviewWhere(
        { kind: "all" },
        ReviewsFilterFor.UPVOTED,
        { kind: "public" },
      );

      expect("votes" in where).toBe(false);
    });

    it("member viewer plus UPVOTED adds votes filter for viewer", () => {
      const where = buildReviewWhere(
        { kind: "all" },
        ReviewsFilterFor.UPVOTED,
        { kind: "member", userId: "u1" },
      );

      expect(where.votes).toEqual({
        some: { voterId: "u1" },
      });
    });

    it("member viewer with filterFor ALL has no votes key", () => {
      const where = buildReviewWhere({ kind: "all" }, ReviewsFilterFor.ALL, {
        kind: "member",
        userId: "u1",
      });

      expect("votes" in where).toBe(false);
    });
  });

  describe("listReviews", () => {
    it("public list receives PUBLIC_REVIEW_FIELDS and blanks rating, body, tips", async () => {
      const row = makeRow();
      const findMany = vi.fn().mockResolvedValue([row]);
      const db = { reviews: { findMany } } as unknown as PrismaClient;

      const res = await listReviews(db, {
        scope: { kind: "all" },
        page: makePage(),
        viewer: { kind: "public" },
      });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: PUBLIC_REVIEW_FIELDS,
        }),
      );
      expect(res.items).toHaveLength(1);
      const item = res.items[0]!;
      expect(item.rating).toBe(0);
      expect(item.body).toBe("");
      expect(item.tips).toBe("");
    });

    it("member viewer with includeEngagement: false succeeds with findMany only and has no engagement key", async () => {
      const row = makeRow();
      const findMany = vi.fn().mockResolvedValue([row]);
      const db = { reviews: { findMany } } as unknown as PrismaClient;

      const res = await listReviews(db, {
        scope: { kind: "all" },
        page: makePage(),
        viewer: { kind: "member", userId: "u1", includeEngagement: false },
      });

      expect(res.items).toHaveLength(1);
      expect("engagement" in res.items[0]!).toBe(false);
    });

    it("member viewer with includeEngagement: true attaches engagement and calls reviewVotes.findMany once with ids", async () => {
      const row1 = makeRow({ id: "rev-1" });
      const row2 = makeRow({ id: "rev-2" });
      const findMany = vi.fn().mockResolvedValue([row1, row2]);
      const reviewVotesFindMany = vi
        .fn()
        .mockResolvedValue([{ reviewId: "rev-1", weight: 1 }]);
      const reviewReactionsGroupBy = vi
        .fn()
        .mockResolvedValue([
          { reviewId: "rev-1", reaction: "LIKE", _count: { _all: 3 } },
        ]);
      const reviewReactionsFindMany = vi
        .fn()
        .mockResolvedValue([{ reviewId: "rev-1", reaction: "LIKE" }]);
      const reviewEventsGroupBy = vi
        .fn()
        .mockResolvedValue([{ reviewId: "rev-1", _count: { _all: 2 } }]);

      const db = {
        reviews: { findMany },
        reviewVotes: { findMany: reviewVotesFindMany },
        reviewReactions: {
          groupBy: reviewReactionsGroupBy,
          findMany: reviewReactionsFindMany,
        },
        reviewEvents: { groupBy: reviewEventsGroupBy },
      } as unknown as PrismaClient;

      const res = await listReviews(db, {
        scope: { kind: "all" },
        page: makePage(),
        viewer: { kind: "member", userId: "u1", includeEngagement: true },
      });

      expect(res.items).toHaveLength(2);
      expect(reviewVotesFindMany).toHaveBeenCalledTimes(1);
      expect(reviewVotesFindMany).toHaveBeenCalledWith({
        where: { voterId: "u1", reviewId: { in: ["rev-1", "rev-2"] } },
        select: { reviewId: true, weight: true },
      });
      expect(res.items[0]?.engagement).toEqual({
        viewerVote: 1,
        viewerReaction: "LIKE",
        reactionCounts: [{ reaction: "LIKE", count: 3 }],
        shareCount: 2,
      });
      expect(res.items[1]?.engagement).toEqual({
        viewerVote: 0,
        viewerReaction: null,
        reactionCounts: [],
        shareCount: 0,
      });
    });

    it("public viewer does not access review engagement tables", async () => {
      const row = makeRow();
      const db = {
        reviews: { findMany: vi.fn().mockResolvedValue([row]) },
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

      const res = await listReviews(db, {
        scope: { kind: "all" },
        page: makePage(),
        viewer: { kind: "public" },
      });

      expect(res.items).toHaveLength(1);
    });

    it("pagination: limit + 1 rows give nextCursor equal to extra row id; limit rows give undefined", async () => {
      const rowA = makeRow({ id: "a" });
      const rowB = makeRow({ id: "b" });
      const rowExtra = makeRow({ id: "extra" });

      const dbWithExtra = {
        reviews: {
          findMany: vi.fn().mockResolvedValue([rowA, rowB, rowExtra]),
        },
      } as unknown as PrismaClient;

      const resFull = await listReviews(dbWithExtra, {
        scope: { kind: "all" },
        page: makePage({ limit: 2 }),
        viewer: { kind: "public" },
      });

      expect(resFull.items).toHaveLength(2);
      expect(resFull.nextCursor).toBe("extra");

      const dbWithoutExtra = {
        reviews: { findMany: vi.fn().mockResolvedValue([rowA, rowB]) },
      } as unknown as PrismaClient;

      const resNotFull = await listReviews(dbWithoutExtra, {
        scope: { kind: "all" },
        page: makePage({ limit: 2 }),
        viewer: { kind: "public" },
      });

      expect(resNotFull.items).toHaveLength(2);
      expect(resNotFull.nextCursor).toBeUndefined();
    });
  });

  describe("toMemberReview characterization", () => {
    it("matches the key set in member-review-keys.json", () => {
      const row = {
        ...memberReviewRow,
        createdAt: new Date(memberReviewRow.createdAt),
      };
      const mapped = toMemberReview(
        row as unknown as Parameters<typeof toMemberReview>[0],
      );
      expect(Object.keys(mapped).sort()).toEqual(expectedKeys);
      expect(mapped.likeCount).toBe(row.countVotes);
      expect(mapped.reviewFor).toBe(ReviewType.PROFESSOR);
      expect(mapped.tips).toBe(row.tips);
    });

    it("masks profanity in the body and the tips", () => {
      const row = {
        ...memberReviewRow,
        createdAt: new Date(memberReviewRow.createdAt),
        body: "This professor is shit at teaching",
        tips: "Avoid this bastard",
      };
      const mapped = toMemberReview(
        row as unknown as Parameters<typeof toMemberReview>[0],
      );
      expect(mapped.body).toBe("This professor is **** at teaching");
      expect(mapped.tips).toBe("Avoid this *******");
    });
  });

  describe("reviewer username masking", () => {
    it("masks the reviewer username in the member review, including the spread reviewer object", () => {
      const row = makeRow({ reviewer: { username: "bastard" } });
      const mapped = toMemberReview(
        row as unknown as Parameters<typeof toMemberReview>[0],
      );
      expect(mapped.username).toBe("*******");
      expect(JSON.stringify(mapped)).not.toContain("bastard");
    });
  });

  describe("reviewPageInput schema caps and defaults", () => {
    it("enforces limit and skip constraints and defaults", () => {
      // Defaults
      const parsedDefault = reviewPageInput.parse({
        filterFor: ReviewsFilterFor.ALL,
        sortBy: ReviewsSortBy.LATEST,
      });
      expect(parsedDefault.limit).toBe(10);
      expect(parsedDefault.skip).toBe(0);

      // Boundaries pass
      const parsedBoundary = reviewPageInput.parse({
        limit: 50,
        skip: 500,
        filterFor: ReviewsFilterFor.ALL,
        sortBy: ReviewsSortBy.LATEST,
      });
      expect(parsedBoundary.limit).toBe(50);
      expect(parsedBoundary.skip).toBe(500);

      // Invalid limits
      expect(() =>
        reviewPageInput.parse({
          limit: 0,
          filterFor: ReviewsFilterFor.ALL,
          sortBy: ReviewsSortBy.LATEST,
        }),
      ).toThrow();

      expect(() =>
        reviewPageInput.parse({
          limit: 51,
          filterFor: ReviewsFilterFor.ALL,
          sortBy: ReviewsSortBy.LATEST,
        }),
      ).toThrow();

      expect(() =>
        reviewPageInput.parse({
          limit: 1.5,
          filterFor: ReviewsFilterFor.ALL,
          sortBy: ReviewsSortBy.LATEST,
        }),
      ).toThrow();

      // Invalid skips
      expect(() =>
        reviewPageInput.parse({
          skip: -1,
          filterFor: ReviewsFilterFor.ALL,
          sortBy: ReviewsSortBy.LATEST,
        }),
      ).toThrow();

      expect(() =>
        reviewPageInput.parse({
          skip: 501,
          filterFor: ReviewsFilterFor.ALL,
          sortBy: ReviewsSortBy.LATEST,
        }),
      ).toThrow();
    });
  });

  describe("getReviewById", () => {
    it("returns member review with engagement when found", async () => {
      const row = makeRow({ id: "rev-1" });
      const db = {
        reviews: { findUnique: vi.fn().mockResolvedValue(row) },
        reviewVotes: { findMany: vi.fn().mockResolvedValue([]) },
        reviewReactions: {
          groupBy: vi.fn().mockResolvedValue([]),
          findMany: vi.fn().mockResolvedValue([]),
        },
        reviewEvents: { groupBy: vi.fn().mockResolvedValue([]) },
      } as unknown as PrismaClient;

      const review = await getReviewById(db, "rev-1", "u1");
      expect(review.id).toBe("rev-1");
      expect(review.username).toBe("alice");
      expect(review.engagement).toEqual({
        viewerVote: 0,
        viewerReaction: null,
        reactionCounts: [],
        shareCount: 0,
      });
    });

    it("throws TRPCError NOT_FOUND when review is missing", async () => {
      const db = {
        reviews: { findUnique: vi.fn().mockResolvedValue(null) },
      } as unknown as PrismaClient;

      await expect(getReviewById(db, "nonexistent", "u1")).rejects.toThrow(
        TRPCError,
      );
    });
  });
});
