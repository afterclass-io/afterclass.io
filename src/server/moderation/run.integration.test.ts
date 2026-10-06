import { beforeAll, describe, expect, inject, it, vi } from "vitest";

// Point the module-level clients (used by runModeration and
// checkAndIncrement) at the Testcontainers database.
vi.mock("@/server/db", async () => {
  const { idb } = await import("@/server/api/integration-test-helpers");
  return { db: idb, txDb: idb };
});

import {
  idb as db,
  seedCourse,
  seedReview,
  seedUser,
} from "@/server/api/integration-test-helpers";

import type { JudgeResult } from "./judge";
import { runModeration, type Judge } from "./run";

const cfg = {
  moderationReportThreshold: 3,
  moderationBackoffMultiplier: 2,
  moderationThresholdCap: 48,
  moderationClaimWindowMinutes: 5,
  moderationJudgementsPerHour: 1_000,
};
const violation: JudgeResult = {
  kind: "violation",
  policyRule: "hate",
  language: "ms",
  rationale: "Uses a slur.",
  model: "test-model",
};
const cleared: JudgeResult = {
  kind: "cleared",
  language: "en",
  rationale: "Harsh but fair.",
  model: "test-model",
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let authorId: string;
let courseId: string;

beforeAll(async () => {
  authorId = (await seedUser(db)).id;
  courseId = (await seedCourse(db)).id;
});

async function reportReview(reviewId: string, n: number) {
  for (let i = 0; i < n; i++) {
    const reporter = await seedUser(db);
    await db.moderationReport.create({
      data: { reporterId: reporter.id, reviewId },
    });
  }
}

describe("runModeration against Postgres", () => {
  it("deletes a review that crosses the threshold and keeps its text in the log", async () => {
    const review = await seedReview(db, {
      reviewerId: authorId,
      courseId,
      body: "vile text",
    });
    await reportReview(review.id, 3);

    await expect(
      runModeration(
        { surface: "review", itemId: review.id },
        cfg,
        async () => violation,
      ),
    ).resolves.toBe("violation");

    expect(
      await db.reviews.findUnique({ where: { id: review.id } }),
    ).toBeNull();
    const log = await db.moderationLog.findFirstOrThrow({
      where: { itemId: review.id },
    });
    expect(log).toMatchObject({
      surface: "REVIEW",
      verdict: "VIOLATION",
      policyRule: "hate",
      language: "ms",
      model: "test-model",
    });
    expect(log.removedText).toContain("vile text");
  });

  it("a cleared review needs double the NEW reporters before the next judgement", async () => {
    const review = await seedReview(db, { reviewerId: authorId, courseId });
    const target = { surface: "review" as const, itemId: review.id };
    await reportReview(review.id, 3);
    await expect(runModeration(target, cfg, async () => cleared)).resolves.toBe(
      "cleared",
    );
    await sleep(10); // later reports must have a strictly later created_at

    await reportReview(review.id, 5);
    const judge = vi.fn<Judge>().mockResolvedValue(cleared);
    await expect(runModeration(target, cfg, judge)).resolves.toBe(
      "below_threshold",
    );

    await reportReview(review.id, 1);
    await expect(runModeration(target, cfg, judge)).resolves.toBe("cleared");
    expect(judge).toHaveBeenCalledTimes(1);
    expect(
      await db.reviews.findUnique({ where: { id: review.id } }),
    ).not.toBeNull();
  });

  it("two runs crossing the threshold at once judge exactly once", async () => {
    const review = await seedReview(db, { reviewerId: authorId, courseId });
    await reportReview(review.id, 3);
    const judge = vi.fn<Judge>(async () => {
      await sleep(50);
      return cleared;
    });
    const target = { surface: "review" as const, itemId: review.id };

    const outcomes = await Promise.all([
      runModeration(target, cfg, judge),
      runModeration(target, cfg, judge),
    ]);

    expect(judge).toHaveBeenCalledTimes(1);
    expect(outcomes.sort()).toEqual(["claim_lost", "cleared"]);
  });

  it("an error verdict removes nothing, logs ERROR, and holds the claim until the window passes", async () => {
    const review = await seedReview(db, { reviewerId: authorId, courseId });
    await reportReview(review.id, 3);
    const target = { surface: "review" as const, itemId: review.id };

    await expect(
      runModeration(target, cfg, async () => ({
        kind: "error",
        reason: "refusal",
        model: "test-model",
      })),
    ).resolves.toBe("error");

    expect(
      await db.reviews.findUnique({ where: { id: review.id } }),
    ).not.toBeNull();
    expect(
      await db.moderationLog.count({
        where: { itemId: review.id, verdict: "ERROR", rationale: "refusal" },
      }),
    ).toBe(1);
    // Same clearance count + same claim window → the retry waits.
    await expect(runModeration(target, cfg, async () => cleared)).resolves.toBe(
      "claim_lost",
    );
  });

  it("an errored item is judged again once the claim window has passed", async () => {
    const review = await seedReview(db, {
      reviewerId: authorId,
      courseId,
      body: "vile text",
    });
    await reportReview(review.id, 3);
    const target = { surface: "review" as const, itemId: review.id };

    await expect(
      runModeration(target, cfg, async () => ({
        kind: "error",
        reason: "timeout",
        model: "test-model",
      })),
    ).resolves.toBe("error");
    await expect(runModeration(target, cfg, async () => violation)).resolves.toBe(
      "claim_lost",
    );

    // Claim windows are fixed windows keyed `<key>:<windowStart>`; once the
    // window has passed the next call uses a fresh, empty row. Deleting the
    // current row is equivalent to that time passing.
    await db.rateLimitWindow.deleteMany({
      where: { key: { startsWith: `moderation:claim:REVIEW:${review.id}:0:` } },
    });

    const judge = vi.fn<Judge>().mockResolvedValue(violation);
    await expect(runModeration(target, cfg, judge)).resolves.toBe("violation");
    expect(judge).toHaveBeenCalledTimes(1);
    expect(
      await db.reviews.findUnique({ where: { id: review.id } }),
    ).toBeNull();
  });

  it("a violating public roadmap becomes private everywhere", async () => {
    const roadmap = await db.userRoadmap.create({
      data: {
        userId: authorId,
        name: "bad name",
        visibility: "PUBLIC",
        publishedAt: new Date(),
        shareToken: `tok-${crypto.randomUUID()}`,
      },
    });
    for (let i = 0; i < 3; i++) {
      const reporter = await seedUser(db);
      await db.moderationReport.create({
        data: { reporterId: reporter.id, roadmapId: roadmap.id },
      });
    }

    await expect(
      runModeration(
        { surface: "roadmap", itemId: roadmap.id },
        cfg,
        async () => violation,
      ),
    ).resolves.toBe("violation");

    await expect(
      db.userRoadmap.findUniqueOrThrow({ where: { id: roadmap.id } }),
    ).resolves.toMatchObject({
      visibility: "PRIVATE",
      publishedAt: null,
      shareToken: null,
      slug: null,
    });
  });

  it("a violating shared timetable loses its share link and calendar feed", async () => {
    const timetable = await db.userTimetable.create({
      data: {
        userId: authorId,
        acadTermId: inject("acadTermId"),
        name: "bad name",
        visibility: "UNLISTED",
        shareToken: `tok-${crypto.randomUUID()}`,
        icalToken: `ical-${crypto.randomUUID()}`,
      },
    });
    for (let i = 0; i < 3; i++) {
      const reporter = await seedUser(db);
      await db.moderationReport.create({
        data: { reporterId: reporter.id, timetableId: timetable.id },
      });
    }

    await expect(
      runModeration(
        { surface: "timetable", itemId: timetable.id },
        cfg,
        async () => violation,
      ),
    ).resolves.toBe("violation");

    await expect(
      db.userTimetable.findUniqueOrThrow({ where: { id: timetable.id } }),
    ).resolves.toMatchObject({
      visibility: "PRIVATE",
      shareToken: null,
      icalToken: null,
    });
  });
});
