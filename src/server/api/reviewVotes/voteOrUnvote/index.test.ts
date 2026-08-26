import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { voteOrUnvote } from "./index";

const router = createTRPCRouter({ voteOrUnvote });

const makeDb = () => ({
  reviewVotes: { upsert: vi.fn().mockResolvedValue({ reviewId: "rev1" }) },
});

describe("reviewVotes.voteOrUnvote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const caller = makeCaller(router.createCaller, makeDb(), null);
    await expect(
      caller.voteOrUnvote({ reviewId: "rev1", weight: 1 }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it.each([1, 0, -1] as const)(
    "upserts weight %i keyed by (reviewId, session user)",
    async (weight) => {
      const dbMock = makeDb();
      const caller = makeCaller(router.createCaller, dbMock);

      await caller.voteOrUnvote({ reviewId: "rev1", weight });

      expect(dbMock.reviewVotes.upsert).toHaveBeenCalledWith({
        where: { reviewId_voterId: { reviewId: "rev1", voterId: "u1" } },
        create: { reviewId: "rev1", voterId: "u1", weight },
        update: { weight },
      });
    },
  );

  it("rejects a weight outside {-1, 0, 1}", async () => {
    const dbMock = makeDb();
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(
      caller.voteOrUnvote({ reviewId: "rev1", weight: 2 as never }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMock.reviewVotes.upsert).not.toHaveBeenCalled();
  });
});
