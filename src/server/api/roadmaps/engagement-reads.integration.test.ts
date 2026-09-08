import { beforeAll, describe, expect, it } from "vitest";

import { idb as db, seedUser } from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";

import { getByRoadmapId } from "../roadmapReactions/getByRoadmapId";
import { count as votesCount } from "../roadmapVotes/count";
import { getByUser as votesByUser } from "../roadmapVotes/getByUser";

const router = createTRPCRouter({ getByRoadmapId, votesCount, votesByUser });

let roadmapId: string;
let ownerId: string;
let u2Id: string;
let u3Id: string;
let strangerId: string;

beforeAll(async () => {
  const [owner, u2, u3, stranger] = await Promise.all([
    seedUser(db),
    seedUser(db),
    seedUser(db),
    seedUser(db),
  ]);
  ownerId = owner.id;
  u2Id = u2.id;
  u3Id = u3.id;
  strangerId = stranger.id;

  const roadmap = await db.userRoadmap.create({
    data: {
      userId: ownerId,
      name: "Engagement Roadmap",
      votes: {
        create: [
          { userId: ownerId, weight: 1 },
          { userId: u2Id, weight: 1 },
          { userId: u3Id, weight: -1 },
        ],
      },
      reactions: {
        create: [
          { userId: ownerId, reaction: "LIKE" },
          { userId: u2Id, reaction: "LIKE" },
          { userId: u3Id, reaction: "THANKFUL" },
        ],
      },
    },
  });
  roadmapId = roadmap.id;
});

describe("roadmapReactions.getByRoadmapId (integration)", () => {
  it("aggregates reaction counts and reports the viewer's own reaction", async () => {
    const res = await makeCaller(router.createCaller, db, {
      user: { id: u2Id },
    }).getByRoadmapId({ roadmapId });

    expect(res.counts.find((c) => c.reaction === "LIKE")?.count).toBe(2);
    expect(res.counts.find((c) => c.reaction === "THANKFUL")?.count).toBe(1);
    expect(res.viewerReaction).toBe("LIKE");
  });

  it("returns a null viewerReaction for an anonymous viewer", async () => {
    const res = await makeCaller(router.createCaller, db, null).getByRoadmapId({
      roadmapId,
    });
    expect(res.viewerReaction).toBeNull();
  });

  it("filters to one reaction type when eventType is given", async () => {
    const res = await makeCaller(router.createCaller, db, {
      user: { id: u2Id },
    }).getByRoadmapId({ roadmapId, eventType: "THANKFUL" });

    expect(res.counts).toEqual([{ reaction: "THANKFUL", count: 1 }]);
    expect(res.viewerReaction).toBeNull(); // u2's reaction is LIKE, filtered out
  });
});

describe("roadmapVotes.count (integration)", () => {
  it("sums the vote weights (1 + 1 - 1)", async () => {
    expect(
      await makeCaller(router.createCaller, db, null).votesCount({ roadmapId }),
    ).toBe(1);
  });
});

describe("roadmapVotes.getByUser (integration)", () => {
  it("defaults to the caller's own vote", async () => {
    const res = await makeCaller(router.createCaller, db, {
      user: { id: ownerId },
    }).votesByUser({ roadmapId });
    expect(res).toMatchObject({ userId: ownerId, roadmapId, weight: 1 });
  });

  it("looks up another user's vote when userId is given", async () => {
    const res = await makeCaller(router.createCaller, db, {
      user: { id: ownerId },
    }).votesByUser({ userId: u3Id, roadmapId });
    expect(res).toMatchObject({ userId: u3Id, weight: -1 });
  });

  it("returns null when the user has not voted", async () => {
    const res = await makeCaller(router.createCaller, db, {
      user: { id: ownerId },
    }).votesByUser({ userId: strangerId, roadmapId });
    expect(res).toBeNull();
  });
});
