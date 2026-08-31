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

import { getAllByType } from "../reviewLabels/getAllByType";
import { getByProfSlug as labelsByProfSlug } from "../reviewLabels/getByProfSlug";
import { countByCourseCode as labelsCountByCourseCode } from "../reviewLabels/countByCourseCode";
import { getByReviewId as reactionsByReviewId } from "../reviewReactions/getByReviewId";
import { count as votesCount } from "../reviewVotes/count";
import { getByUser as votesByUser } from "../reviewVotes/getByUser";
import { count as reviewsCount } from "./count";

const router = createTRPCRouter({
  getAllByType,
  labelsByProfSlug,
  labelsCountByCourseCode,
  reactionsByReviewId,
  votesCount,
  votesByUser,
  reviewsCount,
});
let code: string;
let slug: string;
let reviewerId: string;
let otherId: string;
let strangerId: string;
let courseReviewId: string;
let profReview1Id: string;

beforeAll(async () => {
  const suffix = randomUUID();
  code = `ENG${suffix.slice(0, 8)}`;
  slug = `eng-prof-${suffix}`;

  const course = await seedCourse(db, { code, name: "Engagement Course" });
  const professor = await seedProfessor(db, { slug, name: "Engagement Prof" });
  const [reviewer, other, stranger] = await Promise.all([seedUser(db), seedUser(db), seedUser(db)]);
  reviewerId = reviewer.id;
  otherId = other.id;
  strangerId = stranger.id;

  const common = {
    body: "a".repeat(200),
    reviewedCourseId: course.id,
    reviewedUniversityId: course.belongToUniversityId,
    reviewedFacultyId: course.belongToFacultyId,
    reviewerId,
  };
  const courseReview = await db.reviews.create({
    data: { ...common, rating: 4 },
  });
  courseReviewId = courseReview.id;
  const profReview1 = await db.reviews.create({
    data: { ...common, rating: 2, reviewedProfessorId: professor.id },
  });
  profReview1Id = profReview1.id;
  await db.reviews.create({
    data: { ...common, rating: 3, reviewedProfessorId: professor.id },
  });

  const [courseLabel, profLabel] = await Promise.all([
    db.labels.create({
      data: { name: "INTERESTING", typeOf: ReviewType.COURSE },
    }),
    db.labels.create({
      data: { name: "ENGAGING", typeOf: ReviewType.PROFESSOR },
    }),
  ]);
  await db.reviewLabels.createMany({
    data: [
      { reviewId: courseReviewId, labelId: courseLabel.id },
      { reviewId: profReview1Id, labelId: profLabel.id },
    ],
  });

  await db.reviewVotes.createMany({
    data: [
      { reviewId: profReview1Id, voterId: reviewerId, weight: 1 },
      { reviewId: profReview1Id, voterId: otherId, weight: 1 },
    ],
  });
  await db.reviewReactions.createMany({
    data: [
      { reviewId: profReview1Id, reactingUserId: reviewerId, reaction: "LIKE" },
      {
        reviewId: profReview1Id,
        reactingUserId: otherId,
        reaction: "THANKFUL",
      },
    ],
  });
});

const asReviewer = () => makeCaller(router.createCaller, db, { user: { id: reviewerId } });

describe("reviewLabels.getAllByType (integration)", () => {
  it("returns only labels of the requested review type", async () => {
    const res = await makeCaller(router.createCaller, db, null).getAllByType({
      typeOf: ReviewType.COURSE,
    });
    // Globally unscoped — assert our own row is present and the type filter held.
    expect(res.some((rl) => rl.reviewId === courseReviewId)).toBe(true);
    expect(res.every((rl) => rl.label.typeOf === ReviewType.COURSE)).toBe(true);
  });
});

describe("reviewLabels.getByProfSlug (integration)", () => {
  it("returns label rows for the professor's reviews only", async () => {
    const res = await makeCaller(router.createCaller, db, null).labelsByProfSlug({
      slug,
    });
    expect(res.map((rl) => rl.reviewId)).toEqual([profReview1Id]);
    expect(res[0]!.label.name).toBe("ENGAGING");
  });
});

describe("reviewLabels.countByCourseCode (integration)", () => {
  it("returns every label row attached to a review of the course", async () => {
    const res = await makeCaller(router.createCaller, db, null).labelsCountByCourseCode({
      courseCode: code,
    });
    expect(res.map((rl) => rl.reviewId).toSorted()).toEqual(
      [courseReviewId, profReview1Id].toSorted(),
    );
  });
});

describe("reviewReactions.getByReviewId (integration)", () => {
  it("returns all reactions for the review", async () => {
    const res = await asReviewer().reactionsByReviewId({
      reviewId: profReview1Id,
    });
    expect(res).toHaveLength(2);
  });

  it("filters to one reaction type when eventType is given", async () => {
    const res = await asReviewer().reactionsByReviewId({
      reviewId: profReview1Id,
      eventType: "LIKE",
    });
    expect(res.map((r) => r.reactingUserId)).toEqual([reviewerId]);
  });
});

describe("reviewVotes.count (integration)", () => {
  it("sums the vote weights for a review", async () => {
    expect(
      await makeCaller(router.createCaller, db, null).votesCount({
        reviewId: profReview1Id,
      }),
    ).toBe(2);
  });

  it("returns 0 for a review with no votes", async () => {
    expect(
      await makeCaller(router.createCaller, db, null).votesCount({
        reviewId: courseReviewId,
      }),
    ).toBe(0);
  });
});

describe("reviewVotes.getByUser (integration)", () => {
  it("defaults to the caller's own vote", async () => {
    const res = await asReviewer().votesByUser({ reviewId: profReview1Id });
    expect(res).toMatchObject({ voterId: reviewerId, reviewId: profReview1Id });
  });

  it("looks up another user's vote when userId is given", async () => {
    const res = await asReviewer().votesByUser({
      userId: otherId,
      reviewId: profReview1Id,
    });
    expect(res).toMatchObject({ voterId: otherId });
  });

  it("returns null when the user has not voted", async () => {
    const res = await asReviewer().votesByUser({
      userId: strangerId,
      reviewId: profReview1Id,
    });
    expect(res).toBeNull();
  });
});

describe("reviews.count (integration)", () => {
  it("counts every review of the course", async () => {
    // The unset `profSlug` prunes the `reviewedProfessor` clause entirely, so
    // all three (incl. the course-only review) are counted.
    expect(await asReviewer().reviewsCount({ courseCode: code })).toBe(3);
  });

  it("counts a professor's reviews", async () => {
    expect(await asReviewer().reviewsCount({ profSlug: slug })).toBe(2);
  });
});
