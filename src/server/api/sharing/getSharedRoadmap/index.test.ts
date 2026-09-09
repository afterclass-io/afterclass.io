import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { getSharedRoadmap } from "./index";

// The per-IP throttle is DB-backed (`checkAndIncrement` via `txDb`); stub
// the budget pass-through so these tests pin the share-token lookup, not the
// bucket. Throttle behavior itself is covered by the budget suite.
vi.mock("@/server/assistant/budget", () => ({
  checkBudget: vi.fn().mockResolvedValue({ ok: true, retryAfterSeconds: 0 }),
}));

const router = createTRPCRouter({ getSharedRoadmap });

const roadmapFixture = {
  id: "r1",
  name: "Grad Plan",
  visibility: "UNLISTED",
  shareToken: "tok_valid",
  user: { username: "alice" },
  entries: [
    {
      id: "e1",
      courseId: "c1",
      yearNumber: 1,
      term: "T1",
      sortOrder: 0,
      course: { code: "IS101", name: "Intro", creditUnits: 1, description: "d" },
    },
  ],
};

describe("sharing.getSharedRoadmap", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the roadmap, its entries and the owner's username for a valid token", async () => {
    const findUnique = vi.fn().mockResolvedValue(roadmapFixture);
    const caller = makeCaller(router.createCaller, {
      userRoadmap: { findUnique },
    });

    const result = await caller.getSharedRoadmap({ token: "tok_valid" });

    expect(result).toEqual({
      roadmap: roadmapFixture,
      entries: roadmapFixture.entries,
      ownerUsername: "alice",
    });
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { shareToken: "tok_valid", visibility: { not: "PRIVATE" } },
      }),
    );
  });

  it("throws NOT_FOUND for an unknown or revoked token", async () => {
    // A roadmap that goes PRIVATE has its shareToken nulled by
    // sharing.setVisibility, so "wrong visibility" reaches this procedure as a
    // token that no longer matches — same branch as a bogus token.
    const caller = makeCaller(router.createCaller, {
      userRoadmap: { findUnique: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      caller.getSharedRoadmap({ token: "nope" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
