import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { ReviewReactionType } from "@prisma/client";
import { upsert } from "./index";

const router = createTRPCRouter({ upsert });

function makeDb() {
  return {
    reviewReactions: {
      upsert: vi.fn().mockResolvedValue({ reviewId: "rev1", reaction: "LIKE" }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

describe("reviewReactions.upsert", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const caller = makeCaller(router.createCaller, makeDb(), null);
    await expect(
      caller.upsert({ reviewId: "rev1", reaction: ReviewReactionType.LIKE }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("upserts the reaction keyed by (reviewId, session user)", async () => {
    const dbMock = makeDb();
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.upsert({
      reviewId: "rev1",
      reaction: ReviewReactionType.LIKE,
    });

    expect(result).toEqual({ reviewId: "rev1", reaction: "LIKE" });
    expect(dbMock.reviewReactions.upsert).toHaveBeenCalledWith({
      where: {
        reviewId_reactingUserId: { reactingUserId: "u1", reviewId: "rev1" },
      },
      create: {
        reactingUserId: "u1",
        reviewId: "rev1",
        reaction: ReviewReactionType.LIKE,
      },
      update: { reaction: ReviewReactionType.LIKE },
    });
    expect(dbMock.reviewReactions.deleteMany).not.toHaveBeenCalled();
  });

  it("removes the reaction when none is given (toggle off)", async () => {
    const dbMock = makeDb();
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.upsert({ reviewId: "rev1" });

    expect(result).toEqual({ count: 1 });
    expect(dbMock.reviewReactions.deleteMany).toHaveBeenCalledWith({
      where: { reactingUserId: "u1", reviewId: "rev1" },
    });
    expect(dbMock.reviewReactions.upsert).not.toHaveBeenCalled();
  });
});
