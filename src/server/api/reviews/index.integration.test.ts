import { randomUUID } from "node:crypto";
import { ReviewType } from "@/generated/prisma/enums";
import { beforeAll, describe, expect, it } from "vitest";

import {
  idb as db,
  seedCourse,
  seedProfessor,
  seedUser,
} from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { ReviewsFilterFor, ReviewsSortBy } from "@/modules/reviews/types";

import { getAll } from "./getAll";
import { getAllProtected } from "./getAllProtected";
import { getByCourseCode } from "./getByCourseCode";
import { getByCourseCodeProtected } from "./getByCourseCodeProtected";
import { getById } from "./getById";
import { getByProfSlug } from "./getByProfSlug";
import { getByProfSlugProtected } from "./getByProfSlugProtected";
import { getMetadataForCourse } from "./getMetadataForCourse";
import { getMetadataForProf } from "./getMetadataForProf";

const router = createTRPCRouter({
  getAll,
  getAllProtected,
  getByCourseCode,
  getByCourseCodeProtected,
  getById,
  getByProfSlug,
  getByProfSlugProtected,
  getMetadataForCourse,
  getMetadataForProf,
});
const list = { filterFor: ReviewsFilterFor.ALL, sortBy: ReviewsSortBy.LATEST };

let code: string;
let slug: string;
let courseId: string;
let reviewerId: string;
// createdAt order: courseReview < profReview < profReview2 (seeded in sequence).
let courseReviewId: string; // rating 4, no professor, INTERESTING label
let profReviewId: string; // rating 2, professor, ENGAGING label, upvoted by reviewer
let profReview2Id: string; // rating 3, professor, no label

beforeAll(async () => {
  const suffix = randomUUID();
  code = `REV${suffix.slice(0, 8)}`;
  slug = `prof-${suffix}`;

  const course = await seedCourse(db, { code, name: "Reviewed Course" });
  courseId = course.id;
  const professor = await seedProfessor(db, {
    slug,
    name: "Reviewed Professor",
  });
  const reviewer = await seedUser(db);
  reviewerId = reviewer.id;
  const courseLabel = await db.labels.create({
    data: { name: "INTERESTING", typeOf: ReviewType.COURSE },
  });
  const profLabel = await db.labels.create({
    data: { name: "ENGAGING", typeOf: ReviewType.PROFESSOR },
  });

  const common = {
    body: "a".repeat(200),
    reviewedCourseId: courseId,
    reviewedUniversityId: course.belongToUniversityId,
    reviewedFacultyId: course.belongToFacultyId,
    reviewerId,
  };
  const courseReview = await db.reviews.create({
    data: { ...common, rating: 4, tips: "course tips" },
  });
  courseReviewId = courseReview.id;
  const profReview = await db.reviews.create({
    data: {
      ...common,
      rating: 2,
      tips: null,
      reviewedProfessorId: professor.id,
    },
  });
  profReviewId = profReview.id;
  const profReview2 = await db.reviews.create({
    data: {
      ...common,
      rating: 3,
      tips: "more tips",
      reviewedProfessorId: professor.id,
    },
  });
  profReview2Id = profReview2.id;

  await db.reviewLabels.createMany({
    data: [
      { reviewId: courseReviewId, labelId: courseLabel.id },
      { reviewId: profReviewId, labelId: profLabel.id },
    ],
  });
  await db.reviewVotes.create({
    data: { reviewId: profReviewId, voterId: reviewerId },
  });
});

const asReviewer = () => makeCaller(router.createCaller, db, { user: { id: reviewerId } });
const asAnon = () => makeCaller(router.createCaller, db, null);

describe("reviews.getByCourseCode (integration)", () => {
  it("filters to the given course + professor slugs and blanks private fields", async () => {
    const res = await asAnon().getByCourseCode({
      ...list,
      code,
      slugs: [slug],
      limit: 10,
    });
    expect(res.items.map((r) => r.id).toSorted()).toEqual([profReviewId, profReview2Id].toSorted());
    expect(res.items[0]).toMatchObject({
      courseCode: code,
      university: "SMU",
      reviewFor: ReviewType.PROFESSOR,
      professorSlug: slug,
      rating: 0,
      body: "",
      tips: "",
    });
  });

  it("with no slugs, returns course and professor reviews", async () => {
    const res = await asAnon().getByCourseCode({ ...list, code, limit: 10 });
    const ids = res.items.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining([courseReviewId, profReviewId, profReview2Id]));
    expect(ids).toContain(courseReviewId);
  });
});

describe("reviews.getByCourseCodeProtected (integration)", () => {
  it("returns every review for the course (incl. course-only) with private fields", async () => {
    const res = await asReviewer().getByCourseCodeProtected({
      ...list,
      code,
      limit: 10,
    });
    expect(res.items.map((r) => r.id).toSorted()).toEqual(
      [courseReviewId, profReviewId, profReview2Id].toSorted(),
    );
    const profReview = res.items.find((r) => r.id === profReviewId);
    expect(profReview).toMatchObject({ rating: 2, tips: "" }); // tips null -> ""
  });

  it("UPVOTED filters to reviews the caller has voted on", async () => {
    const res = await asReviewer().getByCourseCodeProtected({
      ...list,
      code,
      filterFor: ReviewsFilterFor.UPVOTED,
      limit: 10,
    });
    expect(res.items.map((r) => r.id)).toEqual([profReviewId]);
  });
});

describe("reviews.getByProfSlug (integration)", () => {
  it("returns only that professor's reviews with private fields blanked", async () => {
    const res = await asAnon().getByProfSlug({ ...list, slug, limit: 10 });
    expect(res.items.map((r) => r.id).toSorted()).toEqual([profReviewId, profReview2Id].toSorted());
    expect(res.items[0]).toMatchObject({
      professorSlug: slug,
      reviewFor: ReviewType.PROFESSOR,
      rating: 0,
      body: "",
    });
  });
});

describe("reviews.getByProfSlugProtected (integration)", () => {
  it("returns the professor's reviews with private fields, UPVOTED narrows to voted", async () => {
    const all = await asReviewer().getByProfSlugProtected({
      ...list,
      slug,
      limit: 10,
    });
    expect(all.items.map((r) => r.id).toSorted()).toEqual([profReviewId, profReview2Id].toSorted());
    expect(all.items.find((r) => r.id === profReview2Id)).toMatchObject({
      rating: 3,
      tips: "more tips",
    });

    const upvoted = await asReviewer().getByProfSlugProtected({
      ...list,
      slug,
      filterFor: ReviewsFilterFor.UPVOTED,
      limit: 10,
    });
    expect(upvoted.items.map((r) => r.id)).toEqual([profReviewId]);
  });
});

describe("reviews.getAll (integration)", () => {
  it("scopes by courseId, sorts LATEST-first, and paginates by cursor", async () => {
    const page1 = await asAnon().getAll({ ...list, courseId, limit: 2 });
    expect(page1.items.map((r) => r.id)).toEqual([profReview2Id, profReviewId]);
    expect(page1.nextCursor).toBe(courseReviewId);

    const page2 = await asAnon().getAll({
      ...list,
      courseId,
      limit: 2,
      cursor: page1.nextCursor,
    });
    expect(page2.items.map((r) => r.id)).toEqual([courseReviewId]);
    expect(page2.nextCursor).toBeUndefined();
  });
});

describe("reviews.getAllProtected (integration)", () => {
  it("UPVOTED + courseId returns only the caller's upvoted review", async () => {
    const res = await asReviewer().getAllProtected({
      ...list,
      courseId,
      filterFor: ReviewsFilterFor.UPVOTED,
      limit: 10,
    });
    expect(res.items.map((r) => r.id)).toEqual([profReviewId]);
  });
});

describe("reviews.getById (integration)", () => {
  it("returns the mapped review DTO", async () => {
    const res = await asReviewer().getById(profReviewId);
    expect(res).toMatchObject({
      id: profReviewId,
      courseCode: code,
      professorSlug: slug,
      reviewFor: ReviewType.PROFESSOR,
      rating: 2,
      tips: "",
      reviewLabels: [{ name: "ENGAGING" }],
    });
    expect(typeof res.createdAt).toBe("number");
  });

  it("throws NOT_FOUND for an unknown id", async () => {
    await expect(asReviewer().getById(randomUUID())).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("reviews.getMetadataForCourse (integration)", () => {
  it("aggregates average rating, review count, and per-label counts", async () => {
    const res = await asAnon().getMetadataForCourse({ code });
    expect(res.reviewCount).toBe(3);
    expect(res.averageRating).toBeCloseTo(3); // (4 + 2 + 3) / 3
    expect(res.reviewLabels.filter((l) => l.count > 0)).toEqual([
      { name: "Interesting", count: 1 },
    ]);
  });

  it("withProfSlugs narrows the aggregation to that professor's reviews", async () => {
    const res = await asAnon().getMetadataForCourse({
      code,
      withProfSlugs: [slug],
    });
    expect(res.reviewCount).toBe(2); // profReview + profReview2, not courseReview
    expect(res.averageRating).toBeCloseTo(2.5); // (2 + 3) / 2
    // INTERESTING was on the excluded course-only review.
    expect(res.reviewLabels.filter((l) => l.count > 0)).toEqual([]);
  });
});

describe("reviews.getMetadataForProf (integration)", () => {
  it("aggregates scoped to the professor's reviews", async () => {
    const res = await asAnon().getMetadataForProf({ slug });
    expect(res.reviewCount).toBe(2);
    expect(res.averageRating).toBeCloseTo(2.5); // (2 + 3) / 2
    expect(res.reviewLabels.filter((l) => l.count > 0)).toEqual([{ name: "Engaging", count: 1 }]);
  });
});
