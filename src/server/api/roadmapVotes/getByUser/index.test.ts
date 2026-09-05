import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { getByUser } from "./index";

const router = createTRPCRouter({ getByUser });

describe("roadmapVotes.getByUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects calls without roadmapId", async () => {
    const caller = makeCaller(router.createCaller, { roadmapVote: { findFirst: vi.fn() } });
    await expect(caller.getByUser({} as never)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("queries by (roadmapId, session user) hitting the unique index", async () => {
    const findFirst = vi.fn().mockResolvedValue({ weight: 1 });
    const caller = makeCaller(router.createCaller, { roadmapVote: { findFirst } });

    const result = await caller.getByUser({ roadmapId: "r1" });

    expect(result).toEqual({ weight: 1 });
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: "u1", roadmapId: "r1" },
    });
  });
});
