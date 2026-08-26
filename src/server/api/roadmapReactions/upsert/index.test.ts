import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { ReviewReactionType } from "@prisma/client";
import { upsert } from "./index";

const router = createTRPCRouter({ upsert });

// Note: this procedure has no PUBLIC/published gate (unlike recordView/recordShare
// it never calls requirePublicRoadmap), so these tests pin arg wiring only, not a
// visibility check.
function makeDb() {
  return {
    roadmapReaction: {
      upsert: vi.fn().mockResolvedValue({ roadmapId: "r1", reaction: "LIKE" }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

describe("roadmapReactions.upsert", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const caller = makeCaller(router.createCaller, makeDb(), null);
    await expect(
      caller.upsert({ roadmapId: "r1", reaction: ReviewReactionType.LIKE }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("upserts the reaction keyed by (roadmapId, session user)", async () => {
    const dbMock = makeDb();
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.upsert({
      roadmapId: "r1",
      reaction: ReviewReactionType.LIKE,
    });

    expect(result).toEqual({ roadmapId: "r1", reaction: "LIKE" });
    expect(dbMock.roadmapReaction.upsert).toHaveBeenCalledWith({
      where: { roadmapId_userId: { userId: "u1", roadmapId: "r1" } },
      create: {
        userId: "u1",
        roadmapId: "r1",
        reaction: ReviewReactionType.LIKE,
      },
      update: { reaction: ReviewReactionType.LIKE },
    });
    expect(dbMock.roadmapReaction.deleteMany).not.toHaveBeenCalled();
  });

  it("removes the reaction when none is given (toggle off)", async () => {
    const dbMock = makeDb();
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.upsert({ roadmapId: "r1" });

    expect(result).toEqual({ count: 1 });
    expect(dbMock.roadmapReaction.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", roadmapId: "r1" },
    });
    expect(dbMock.roadmapReaction.upsert).not.toHaveBeenCalled();
  });
});
