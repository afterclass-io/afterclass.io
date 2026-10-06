import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, inject, it } from "vitest";

import { ReviewType } from "@/generated/prisma/enums";
import {
  idb as db,
  seedCourse,
  seedReview,
  seedUser,
} from "@/server/api/integration-test-helpers";

let authorId: string;
let reporterId: string;
let courseId: string;

beforeAll(async () => {
  const [author, reporter] = await Promise.all([seedUser(db), seedUser(db)]);
  authorId = author.id;
  reporterId = reporter.id;
  courseId = (await seedCourse(db)).id;
});

const seedRoadmap = () =>
  db.userRoadmap.create({ data: { userId: authorId, name: "Roadmap" } });

describe("moderation_reports exactly-one-item CHECK", () => {
  it("exists in the database", async () => {
    const rows = await db.$queryRaw<{ conname: string }[]>`
      SELECT conname FROM pg_constraint
      WHERE conname = 'moderation_reports_exactly_one_item'`;
    expect(rows).toHaveLength(1);
  });

  it("rejects a report with no item", async () => {
    await expect(
      db.moderationReport.create({ data: { reporterId } }),
    ).rejects.toThrow();
  });

  it("rejects a report with two items", async () => {
    const review = await seedReview(db, { reviewerId: authorId, courseId });
    const roadmap = await seedRoadmap();
    await expect(
      db.moderationReport.create({
        data: { reporterId, reviewId: review.id, roadmapId: roadmap.id },
      }),
    ).rejects.toThrow();
  });

  it("accepts exactly one item and rejects the same reporter twice (P2002)", async () => {
    const review = await seedReview(db, { reviewerId: authorId, courseId });
    await db.moderationReport.create({
      data: { reporterId, reviewId: review.id },
    });
    await expect(
      db.moderationReport.create({ data: { reporterId, reviewId: review.id } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("treats a duplicate as a silent no-op with createMany skipDuplicates", async () => {
    const review = await seedReview(db, { reviewerId: authorId, courseId });
    const first = await db.moderationReport.createMany({
      data: [{ reporterId, reviewId: review.id }],
      skipDuplicates: true,
    });
    const second = await db.moderationReport.createMany({
      data: [{ reporterId, reviewId: review.id }],
      skipDuplicates: true,
    });
    expect(first.count).toBe(1);
    expect(second.count).toBe(0);
  });
});

describe("cascades", () => {
  it("deleting a review removes its votes, labels, events, reactions and reports", async () => {
    const review = await seedReview(db, { reviewerId: authorId, courseId });
    const label = await db.labels.create({
      data: { name: "INTERESTING", typeOf: ReviewType.COURSE },
    });
    await db.reviewVotes.create({
      data: { reviewId: review.id, voterId: reporterId },
    });
    await db.reviewLabels.create({
      data: { reviewId: review.id, labelId: label.id },
    });
    await db.reviewEvents.create({
      data: { id: randomUUID(), reviewId: review.id, eventType: "VIEW" },
    });
    await db.reviewReactions.create({
      data: {
        reviewId: review.id,
        reactingUserId: reporterId,
        reaction: "LIKE",
      },
    });
    await db.moderationReport.create({
      data: { reporterId, reviewId: review.id },
    });

    await db.reviews.delete({ where: { id: review.id } });

    const where = { reviewId: review.id };
    expect(await db.reviewVotes.count({ where })).toBe(0);
    expect(await db.reviewLabels.count({ where })).toBe(0);
    expect(await db.reviewEvents.count({ where })).toBe(0);
    expect(await db.reviewReactions.count({ where })).toBe(0);
    expect(await db.moderationReport.count({ where })).toBe(0);
  });

  it("deleting a roadmap removes its reports", async () => {
    const roadmap = await seedRoadmap();
    await db.moderationReport.create({
      data: { reporterId, roadmapId: roadmap.id },
    });
    await db.userRoadmap.delete({ where: { id: roadmap.id } });
    expect(
      await db.moderationReport.count({ where: { roadmapId: roadmap.id } }),
    ).toBe(0);
  });

  it("deleting a timetable removes its reports", async () => {
    const timetable = await db.userTimetable.create({
      data: {
        userId: authorId,
        acadTermId: inject("acadTermId"),
        name: "Timetable",
      },
    });
    await db.moderationReport.create({
      data: { reporterId, timetableId: timetable.id },
    });
    await db.userTimetable.delete({ where: { id: timetable.id } });
    expect(
      await db.moderationReport.count({ where: { timetableId: timetable.id } }),
    ).toBe(0);
  });

  it("deleting a reporter removes their reports", async () => {
    const reporter = await seedUser(db);
    const review = await seedReview(db, { reviewerId: authorId, courseId });
    await db.moderationReport.create({
      data: { reporterId: reporter.id, reviewId: review.id },
    });
    await db.users.delete({ where: { id: reporter.id } });
    expect(
      await db.moderationReport.count({ where: { reporterId: reporter.id } }),
    ).toBe(0);
  });

  it("log rows survive the deletion of the item they describe", async () => {
    const review = await seedReview(db, { reviewerId: authorId, courseId });
    const log = await db.moderationLog.create({
      data: {
        surface: "REVIEW",
        itemId: review.id,
        verdict: "VIOLATION",
        model: "test-model",
        removedText: "removed",
      },
    });
    await db.reviews.delete({ where: { id: review.id } });
    expect(
      await db.moderationLog.findUnique({ where: { id: log.id } }),
    ).not.toBeNull();
  });
});
