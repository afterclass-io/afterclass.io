import { describe, expect, it } from "vitest";

import {
  idb as db,
  seedCourse,
  seedProfessor,
  seedUser,
} from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { ReviewableEnum, ReviewerEnum } from "@/modules/submit/types";
import { create } from "./index";

const router = createTRPCRouter({ create });

const longBody = "a".repeat(200);

/** Seeds a course/professor/user/labels tuple with unique ids, so tests never collide. */
async function seedFixture() {
  const course = await seedCourse(db);
  const professor = await seedProfessor(db);
  const user = await seedUser(db);
  const courseLabel = await db.labels.create({
    data: { name: "INTERESTING", typeOf: "COURSE" },
  });
  const professorLabel = await db.labels.create({
    data: { name: "ENGAGING", typeOf: "PROFESSOR" },
  });
  return { course, professor, user, courseLabel, professorLabel };
}

describe("reviews.create (integration)", () => {
  it("writes a course review and a professor review with labels to the real database", async () => {
    const { course, professor, user, courseLabel, professorLabel } = await seedFixture();
    const caller = makeCaller(router.createCaller, db, {
      user: { id: user.id },
    });

    await caller.create({
      type: ReviewableEnum.PROFESSOR,
      submitAs: ReviewerEnum.USER,
      course: {
        value: course.id,
        rating: 4,
        body: longBody,
        tips: "course tips",
        labels: [String(courseLabel.id)],
      },
      professor: {
        value: professor.id,
        rating: 5,
        body: longBody,
        tips: "professor tips",
        labels: [String(professorLabel.id)],
      },
    });

    const reviews = await db.reviews.findMany({
      where: { reviewerId: user.id },
      orderBy: { createdAt: "asc" },
    });
    expect(reviews).toHaveLength(2);

    const courseReview = reviews.find((r) => r.reviewedProfessorId === null);
    const professorReview = reviews.find((r) => r.reviewedProfessorId === professor.id);
    expect(courseReview).toMatchObject({
      reviewedCourseId: course.id,
      rating: 4,
      tips: "course tips",
    });
    expect(professorReview).toMatchObject({
      reviewedCourseId: course.id,
      reviewedProfessorId: professor.id,
      rating: 5,
      tips: "professor tips",
    });

    const labels = await db.reviewLabels.findMany({
      where: { reviewId: { in: reviews.map((r) => r.id) } },
      include: { label: true },
    });
    expect(labels.map((l) => l.label.name).toSorted()).toEqual(["ENGAGING", "INTERESTING"]);
  });

  it("throws BAD_REQUEST when a label id violates a real foreign key constraint", async () => {
    const { course, user } = await seedFixture();
    const caller = makeCaller(router.createCaller, db, {
      user: { id: user.id },
    });

    await expect(
      caller.create({
        type: ReviewableEnum.COURSE,
        submitAs: ReviewerEnum.USER,
        course: {
          value: course.id,
          rating: 3,
          body: longBody,
          tips: "tips",
          labels: ["999999"],
        },
        professor: {},
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const orphanedReviews = await db.reviews.findMany({
      where: { reviewerId: user.id },
    });
    expect(orphanedReviews).toHaveLength(0);
    const orphanedLabels = await db.reviewLabels.findMany({
      where: { reviewId: { in: orphanedReviews.map((r) => r.id) } },
    });
    expect(orphanedLabels).toHaveLength(0);
  });
});
