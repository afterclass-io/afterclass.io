import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { getByReviewId } from "./index";

const router = createTRPCRouter({ getByReviewId });

describe("reviewReactions.getByReviewId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps rows to { reaction, byViewer } and strips reactingUserId", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { reaction: "LIKE", reactingUserId: "u1" },
      { reaction: "THANKFUL", reactingUserId: "u2" },
    ]);
    const caller = makeCaller(router.createCaller, {
      reviewReactions: { findMany },
    });

    const result = await caller.getByReviewId({ reviewId: "rev1" });

    expect(result).toEqual([
      { reaction: "LIKE", byViewer: true },
      { reaction: "THANKFUL", byViewer: false },
    ]);
    for (const row of result) {
      expect(row).not.toHaveProperty("reactingUserId");
    }
    expect(findMany).toHaveBeenCalledWith({
      where: {
        reviewId: "rev1",
        reaction: undefined,
      },
      select: { reaction: true, reactingUserId: true },
    });
  });
});
