import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Prisma } from "@/generated/prisma/client";

const hide = vi.hoisted(() => ({
  hideRoadmap: vi.fn(),
}));
vi.mock("@/server/api/sharing/hide", () => hide);

import { MODERATION_SURFACES, REPORT_SURFACES } from "./surfaces";

const asDb = (db: unknown) => db as Prisma.TransactionClient;

beforeEach(() => vi.clearAllMocks());

describe("MODERATION_SURFACES", () => {
  it("registers exactly the v1 surfaces", () => {
    expect(Object.keys(MODERATION_SURFACES).sort()).toEqual(
      [...REPORT_SURFACES].sort(),
    );
  });

  describe("review", () => {
    const review = MODERATION_SURFACES.review;

    it("resolves the reviewer as owner", async () => {
      const findUnique = vi
        .fn()
        .mockResolvedValue({ id: "rv1", reviewerId: "author" });
      await expect(
        review.resolve(asDb({ reviews: { findUnique } }), "rv1"),
      ).resolves.toEqual({ itemId: "rv1", ownerId: "author" });
      expect(findUnique).toHaveBeenCalledWith({
        where: { id: "rv1" },
        select: { id: true, reviewerId: true },
      });
    });

    it("resolves null for a missing review", async () => {
      const findUnique = vi.fn().mockResolvedValue(null);
      await expect(
        review.resolve(asDb({ reviews: { findUnique } }), "x"),
      ).resolves.toBeNull();
    });

    it("labels body and tips for the judge", async () => {
      const findUnique = vi
        .fn()
        .mockResolvedValue({ body: "Body text", tips: "Tip text" });
      await expect(
        review.readText(asDb({ reviews: { findUnique } }), "rv1"),
      ).resolves.toBe("Review:\nBody text\n\nTips:\nTip text");
    });

    it("deletes the review on violation (idempotent)", async () => {
      const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
      await review.applyViolation(asDb({ reviews: { deleteMany } }), "rv1");
      expect(deleteMany).toHaveBeenCalledWith({ where: { id: "rv1" } });
    });

    it("builds report rows and filters on the review relation", () => {
      expect(review.reportData("u1", "rv1")).toEqual({
        reporterId: "u1",
        reviewId: "rv1",
      });
      expect(review.reportsFor("rv1")).toEqual({ reviewId: "rv1" });
    });
  });

  describe("roadmap", () => {
    const roadmap = MODERATION_SURFACES.roadmap;

    it("resolves only roadmaps visible to non-owners", async () => {
      const findFirst = vi
        .fn()
        .mockResolvedValue({ id: "r1", userId: "owner" });
      await expect(
        roadmap.resolve(asDb({ userRoadmap: { findFirst } }), "r1"),
      ).resolves.toEqual({ itemId: "r1", ownerId: "owner" });
      expect(findFirst).toHaveBeenCalledWith({
        where: { id: "r1", visibility: { not: "PRIVATE" } },
        select: { id: true, userId: true },
      });
    });

    it("labels title and description", async () => {
      const findUnique = vi
        .fn()
        .mockResolvedValue({ name: "Plan", description: "Desc" });
      await expect(
        roadmap.readText(asDb({ userRoadmap: { findUnique } }), "r1"),
      ).resolves.toBe("Title: Plan\nDescription: Desc");
    });

    it("hides the roadmap on violation", async () => {
      const tx = asDb({});
      await roadmap.applyViolation(tx, "r1");
      expect(hide.hideRoadmap).toHaveBeenCalledWith(tx, "r1");
    });
  });
});
