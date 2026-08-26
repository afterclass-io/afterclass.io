import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { unpublish } from "./index";

const router = createTRPCRouter({ unpublish });

describe("roadmaps.unpublish", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const dbMock = { userRoadmap: { findUnique: vi.fn(), update: vi.fn() } };
    const caller = makeCaller(router.createCaller, dbMock, null);
    await expect(caller.unpublish({ roadmapId: "r1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("reverts an owned roadmap to PRIVATE and clears slug/publishedAt/shareToken", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({ userId: "u1" }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.unpublish({ roadmapId: "r1" });

    expect(result).toEqual({ success: true });
    expect(dbMock.userRoadmap.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: {
        visibility: "PRIVATE",
        slug: null,
        publishedAt: null,
        shareToken: null,
      },
    });
  });

  it("forbids unpublishing a roadmap owned by another user", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({ userId: "someone-else" }),
        update: vi.fn(),
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(caller.unpublish({ roadmapId: "r1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(dbMock.userRoadmap.update).not.toHaveBeenCalled();
  });
});
