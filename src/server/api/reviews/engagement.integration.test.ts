import { randomUUID } from "node:crypto";
import { ReviewEventType, ReviewReactionType } from "@/generated/prisma/enums";
import { ReviewsFilterFor, ReviewsSortBy } from "@/common/types/reviews";
import {
  countQueries,
  idb as db,
  seedCourse,
  seedUser,
} from "@/server/api/integration-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { countEvent } from "../reviewEvents/countEvent";
import { getByReviewId as reactionsByReviewId } from "../reviewReactions/getByReviewId";
import { count as votesCount } from "../reviewVotes/count";
import { getByUser as votesByUser } from "../reviewVotes/getByUser";
import fixture from "./fixtures/review-engagement.json";
import { getAll } from "./getAll";
import { getAllProtected } from "./getAllProtected";
import { getById } from "./getById";
import { getEngagement } from "./getEngagement";

const router = createTRPCRouter({
  getAll,
  getAllProtected,
  getById,
  getEngagement,
  votesCount,
  votesByUser,
  reactionsByReviewId,
  countEvent,
});

const list = {
  filterFor: ReviewsFilterFor.ALL,
  sortBy: ReviewsSortBy.LATEST,
};

let viewerId: string;
let user2Id: string;
let user3Id: string;
let authorId: string;
let courseId: string;
let courseCode: string;

beforeAll(async () => {
  const suffix = randomUUID();
  courseCode = `ENG${suffix.slice(0, 8)}`;
  const course = await seedCourse(db, {
    code: courseCode,
    name: "Engagement Integration Course",
  });
  courseId = course.id;

  const [viewerUser, user2, user3, authorUser] = await Promise.all([
    seedUser(db),
    seedUser(db),
    seedUser(db),
    seedUser(db),
  ]);
  viewerId = viewerUser.id;
  user2Id = user2.id;
  user3Id = user3.id;
  authorId = authorUser.id;

  const userMap: Record<string, string> = {
    viewer: viewerId,
    "user-2": user2Id,
    "user-3": user3Id,
  };

  await db.reviews.deleteMany({
    where: { id: { in: fixture.reviews.map((r) => r.id) } },
  });

  for (const r of fixture.reviews) {
    await db.reviews.create({
      data: {
        id: r.id,
        rating: r.rating,
        body: r.body,
        tips: r.tips,
        reviewerId: authorId,
        reviewedCourseId: courseId,
        reviewedUniversityId: course.belongToUniversityId,
        reviewedFacultyId: course.belongToFacultyId,
      },
    });

    for (const v of r.votes) {
      await db.reviewVotes.create({
        data: {
          reviewId: r.id,
          voterId: userMap[v.voter]!,
          weight: v.weight,
        },
      });
    }

    for (const rx of r.reactions) {
      await db.reviewReactions.create({
        data: {
          reviewId: r.id,
          reactingUserId: userMap[rx.user]!,
          reaction: rx.reaction as ReviewReactionType,
        },
      });
    }

    for (let i = 0; i < r.shareCount; i++) {
      await db.reviewEvents.create({
        data: {
          id: randomUUID(),
          reviewId: r.id,
          eventType: ReviewEventType.SHARE,
          triggeringUserId: authorId,
        },
      });
    }
  }
});

afterAll(async () => {
  await db.reviews.deleteMany({
    where: { id: { in: fixture.reviews.map((r) => r.id) } },
  });
});

const asViewer = () =>
  makeCaller(router.createCaller, db, { user: { id: viewerId } });
const asUser2 = () =>
  makeCaller(router.createCaller, db, { user: { id: user2Id } });
const asAnon = () => makeCaller(router.createCaller, db, null);

describe("reviews engagement integration (engagement.integration.test.ts)", () => {
  it("getAllProtected statements diff with includeEngagement: true vs false is exactly 4", async () => {
    const { statements: withEngStatements } = await countQueries(db, () =>
      asViewer().getAllProtected({
        ...list,
        courseId,
        includeEngagement: true,
        limit: 10,
      }),
    );

    const { statements: withoutEngStatements } = await countQueries(db, () =>
      asViewer().getAllProtected({
        ...list,
        courseId,
        includeEngagement: false,
        limit: 10,
      }),
    );

    expect(withEngStatements - withoutEngStatements).toBe(4);
  });

  it("statements for 10-review page equals 1-review page with includeEngagement: true", async () => {
    const { statements: tenStatements } = await countQueries(db, () =>
      asViewer().getAllProtected({
        ...list,
        courseId,
        includeEngagement: true,
        limit: 10,
      }),
    );

    const { statements: oneStatement } = await countQueries(db, () =>
      asViewer().getAllProtected({
        ...list,
        courseId,
        includeEngagement: true,
        limit: 1,
      }),
    );

    expect(tenStatements).toBe(oneStatement);
  });

  it("engagement values and likeCount match old single-item procedures and trigger count for every seeded review", async () => {
    const res = await asViewer().getAllProtected({
      ...list,
      courseId,
      includeEngagement: true,
      limit: 12,
    });

    expect(res.items).toHaveLength(12);

    for (const item of res.items) {
      expect(item.engagement).toBeDefined();
      const eng = item.engagement!;

      // 1. reviewVotes.count vs likeCount
      const voteCount = await asViewer().votesCount({ reviewId: item.id });
      expect(item.likeCount).toBe(voteCount);

      // 2. reviewVotes.getByUser vs viewerVote
      const userVote = await asViewer().votesByUser({ reviewId: item.id });
      expect(eng.viewerVote).toBe(userVote?.weight ?? 0);

      // 3. reviewReactions.getByReviewId mapped vs viewerReaction and reactionCounts
      const reactions = await asViewer().reactionsByReviewId({
        reviewId: item.id,
      });
      const expectedViewerReaction =
        reactions.find((rx) => rx.byViewer)?.reaction ?? null;
      expect(eng.viewerReaction).toBe(expectedViewerReaction);

      const countMap = new Map<ReviewReactionType, number>();
      for (const rx of reactions) {
        countMap.set(rx.reaction, (countMap.get(rx.reaction) ?? 0) + 1);
      }
      const expectedReactionCounts = Object.values(ReviewReactionType)
        .filter((type) => (countMap.get(type) ?? 0) > 0)
        .map((reaction) => ({ reaction, count: countMap.get(reaction)! }));
      expect(eng.reactionCounts).toEqual(expectedReactionCounts);

      // 4. reviewEvents.countEvent vs shareCount
      const shareEventCount = await asViewer().countEvent({
        reviewId: item.id,
        eventType: ReviewEventType.SHARE,
      });
      expect(eng.shareCount).toBe(shareEventCount);
    }
  });

  it("no response key at any depth is named reactingUserId or voterId", async () => {
    const res = await asViewer().getAllProtected({
      ...list,
      courseId,
      includeEngagement: true,
      limit: 12,
    });

    function assertNoForbiddenKeys(obj: unknown) {
      if (obj && typeof obj === "object") {
        for (const [key, val] of Object.entries(obj)) {
          expect(key).not.toBe("reactingUserId");
          expect(key).not.toBe("voterId");
          assertNoForbiddenKeys(val);
        }
      }
    }

    assertNoForbiddenKeys(res);
    const json = JSON.stringify(res);
    expect(json).not.toContain("reactingUserId");
    expect(json).not.toContain("voterId");
  });

  it("a second user sees their own viewerVote, not the first user's", async () => {
    const viewerRes = await asViewer().getAllProtected({
      ...list,
      courseId,
      includeEngagement: true,
      limit: 12,
    });

    const user2Res = await asUser2().getAllProtected({
      ...list,
      courseId,
      includeEngagement: true,
      limit: 12,
    });

    // Check rev-eng-04: viewer has vote 1, user-2 has vote -1
    const viewerRev4 = viewerRes.items.find((it) => it.id === "rev-eng-04");
    const user2Rev4 = user2Res.items.find((it) => it.id === "rev-eng-04");

    expect(viewerRev4?.engagement?.viewerVote).toBe(1);
    expect(user2Rev4?.engagement?.viewerVote).toBe(-1);

    // Check rev-eng-06: viewer has vote 0, user-2 has vote 1
    const viewerRev6 = viewerRes.items.find((it) => it.id === "rev-eng-06");
    const user2Rev6 = user2Res.items.find((it) => it.id === "rev-eng-06");

    expect(viewerRev6?.engagement?.viewerVote).toBe(0);
    expect(user2Rev6?.engagement?.viewerVote).toBe(1);
  });

  it("getAll (public) response has no engagement key and issues no query on review_votes, review_reactions or review_events", async () => {
    const { result, queries } = await countQueries(db, () =>
      asAnon().getAll({
        ...list,
        courseId,
        limit: 10,
      }),
    );

    expect(result.items.length).toBeGreaterThan(0);
    for (const item of result.items) {
      expect("engagement" in item).toBe(false);
    }

    for (const q of queries) {
      const lower = q.toLowerCase();
      expect(lower).not.toContain("review_votes");
      expect(lower).not.toContain("review_reactions");
      expect(lower).not.toContain("review_events");
    }
  });

  it("getById returns member review with engagement embedded", async () => {
    const res = await asViewer().getById("rev-eng-01");
    expect(res.id).toBe("rev-eng-01");
    expect(res.engagement).toBeDefined();
    expect(res.engagement?.viewerVote).toBe(1);
    expect(res.engagement?.viewerReaction).toBe(ReviewReactionType.LIKE);
    expect(res.engagement?.shareCount).toBe(2);
  });

  it("getEngagement returns map with one entry per requested id", async () => {
    const res = await asViewer().getEngagement({
      reviewIds: ["rev-eng-01", "rev-eng-02"],
    });
    expect(Object.keys(res).sort()).toEqual(["rev-eng-01", "rev-eng-02"]);
    expect(res["rev-eng-01"]?.viewerVote).toBe(1);
    expect(res["rev-eng-02"]?.viewerVote).toBe(-1);
  });
});
