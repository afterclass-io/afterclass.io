import { describe, expect, it, vi } from "vitest";
import { ReviewType } from "@/generated/prisma/enums";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { ReviewsFilterFor, ReviewsSortBy } from "@/common/types/reviews";

import { getAll } from "./getAll";
import { getAllProtected } from "./getAllProtected";
import { getByCourseCodeProtected } from "./getByCourseCodeProtected";
import { getByProfSlugProtected } from "./getByProfSlugProtected";
import { PRIVATE_REVIEW_FIELDS, PUBLIC_REVIEW_FIELDS } from "./constants";

import memberReviewRow from "./fixtures/member-review-row.json";
import expectedKeys from "./fixtures/member-review-keys.json";

const router = createTRPCRouter({
  getAll,
  getAllProtected,
  getByCourseCodeProtected,
  getByProfSlugProtected,
});

describe("reviews characterization (baseline 6ea5ba90 contracts)", () => {
  it("characterizes member review DTO keys from member-review-row fixture", () => {
    // Current mapping contract at 6ea5ba90
    const row = {
      ...memberReviewRow,
      createdAt: new Date(memberReviewRow.createdAt),
    };

    const mapped = {
      ...row,
      tips: row.tips ?? "",
      createdAt: row.createdAt.getTime(),
      courseCode: row.reviewedCourse.code,
      courseName: row.reviewedCourse.name,
      username: row.reviewer.username ?? "Anonymous",
      reviewLabels: row.reviewLabels.map((rl) => ({ name: rl.label.name })),
      likeCount: row.countVotes,
      reviewFor:
        row.reviewedCourseId && row.reviewedProfessorId
          ? ReviewType.PROFESSOR
          : ReviewType.COURSE,
      professorName: row.reviewedProfessor?.name,
      professorSlug: row.reviewedProfessor?.slug,
      university: row.reviewedUniversity.abbrv,
    };

    expect(Object.keys(mapped).sort()).toEqual(expectedKeys);
  });

  it("characterizes getAllProtected procedure output key set", async () => {
    const row = {
      ...memberReviewRow,
      createdAt: new Date(memberReviewRow.createdAt),
    };
    const dbMock = {
      reviews: { findMany: vi.fn().mockResolvedValue([row]) },
    };
    const caller = makeCaller(router.createCaller, dbMock, {
      user: { id: "u1" },
    });

    const res = await caller.getAllProtected({
      filterFor: ReviewsFilterFor.ALL,
      sortBy: ReviewsSortBy.LATEST,
    });

    expect(res.items).toHaveLength(1);
    const item = res.items[0]!;
    expect(Object.keys(item).sort()).toEqual(expectedKeys);
    expect(item.likeCount).toBe(row.countVotes);
    expect(item.reviewFor).toBe(ReviewType.PROFESSOR);
    expect(item.tips).toBe(row.tips);
  });

  it("characterizes public getAll procedure output masking", async () => {
    const row = {
      ...memberReviewRow,
      createdAt: new Date(memberReviewRow.createdAt),
    };
    const dbMock = {
      reviews: { findMany: vi.fn().mockResolvedValue([row]) },
    };
    const caller = makeCaller(router.createCaller, dbMock, null);

    const res = await caller.getAll({
      filterFor: ReviewsFilterFor.ALL,
      sortBy: ReviewsSortBy.LATEST,
    });

    expect(res.items).toHaveLength(1);
    const item = res.items[0]!;
    expect(item.rating).toBe(0);
    expect(item.body).toBe("");
    expect(item.tips).toBe("");
  });

  it("characterizes review select field contracts", () => {
    // PRIVATE_REVIEW_FIELDS extends PUBLIC_REVIEW_FIELDS with private fields
    const publicKeys = Object.keys(PUBLIC_REVIEW_FIELDS);
    for (const key of publicKeys) {
      expect(PRIVATE_REVIEW_FIELDS).toHaveProperty(key);
    }
    expect(PRIVATE_REVIEW_FIELDS).toHaveProperty("body", true);
    expect(PRIVATE_REVIEW_FIELDS).toHaveProperty("tips", true);
    expect(PRIVATE_REVIEW_FIELDS).toHaveProperty("rating", true);
  });
});
