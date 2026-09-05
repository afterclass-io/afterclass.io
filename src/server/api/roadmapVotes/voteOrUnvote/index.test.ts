import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { voteOrUnvote } from "./index";

const router = createTRPCRouter({ voteOrUnvote });

// Note: this procedure has no PUBLIC/published gate (it never calls
// requirePublicRoadmap), so these tests pin arg wiring only, not a visibility check.
const makeDb = () => ({
  roadmapVote: { upsert: vi.fn().mockResolvedValue({ roadmapId: "r1" }) },
});

describe("roadmapVotes.voteOrUnvote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const caller = makeCaller(router.createCaller, makeDb(), null);
    await expect(
      caller.voteOrUnvote({ roadmapId: "r1", weight: 1 }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it.each([1, 0, -1] as const)(
    "upserts weight %i keyed by (roadmapId, session user)",
    async (weight) => {
      const dbMock = makeDb();
      const caller = makeCaller(router.createCaller, dbMock);

      await caller.voteOrUnvote({ roadmapId: "r1", weight });

      expect(dbMock.roadmapVote.upsert).toHaveBeenCalledWith({
        where: { roadmapId_userId: { roadmapId: "r1", userId: "u1" } },
        create: { roadmapId: "r1", userId: "u1", weight },
        update: { weight },
      });
    },
  );

  it("rejects a weight outside {-1, 0, 1}", async () => {
    const dbMock = makeDb();
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(
      caller.voteOrUnvote({ roadmapId: "r1", weight: 2 as never }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMock.roadmapVote.upsert).not.toHaveBeenCalled();
  });
});
