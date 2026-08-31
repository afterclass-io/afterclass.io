import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { resetLimits } from "@/server/api/engagement-limit";
import { recordShare } from "./index";

const router = createTRPCRouter({ recordShare });

/** db mock: a published PUBLIC roadmap exists, updateMany succeeds. */
function makeDb() {
  return {
    userRoadmap: {
      findFirst: vi.fn().mockResolvedValue({
        id: "r1",
        visibility: "PUBLIC",
        publishedAt: new Date(),
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

describe("roadmaps.recordShare", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => resetLimits());

  it("increments shareCount for a public roadmap (anonymous caller)", async () => {
    const dbMock = makeDb();
    const caller = makeCaller(router.createCaller, dbMock, null);

    const result = await caller.recordShare({ roadmapId: "r1" });

    expect(result).toEqual({ success: true });
    expect(dbMock.userRoadmap.updateMany).toHaveBeenCalledWith({
      where: { id: "r1", visibility: "PUBLIC" },
      data: { shareCount: { increment: 1 } },
    });
  });

  it("throws NOT_FOUND for a roadmap that is not public/published", async () => {
    const dbMock = makeDb();
    dbMock.userRoadmap.findFirst.mockResolvedValue(null);
    const caller = makeCaller(router.createCaller, dbMock, null);

    await expect(caller.recordShare({ roadmapId: "r1" })).rejects.toMatchObject(
      {
        code: "NOT_FOUND",
      },
    );
    expect(dbMock.userRoadmap.updateMany).not.toHaveBeenCalled();
  });
});
