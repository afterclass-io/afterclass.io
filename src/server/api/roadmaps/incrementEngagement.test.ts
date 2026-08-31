import { describe, expect, it, vi, afterEach } from "vitest";
import { resetLimits } from "@/server/api/engagement-limit";
import { incrementEngagement } from "./incrementEngagement";

// Not a createCaller test: incrementEngagement is a plain exported function that
// takes `db` as an argument, so it doesn't use the shared trpc-test-helpers
// caller — it only needs @/server/db stubbed so the module graph loads.
vi.mock("@/server/db", () => ({ db: {} }));

describe("incrementEngagement", () => {
  afterEach(() => resetLimits());

  it("increments the field for a public roadmap within the rate limit", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const db = {
      userRoadmap: {
        findFirst: vi.fn().mockResolvedValue({
          id: "r1",
          visibility: "PUBLIC",
          publishedAt: new Date(),
        }),
        updateMany,
      },
    };
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4" });
    const ok = await incrementEngagement(
      db as never,
      { roadmapId: "r1", field: "viewCount" },
      headers,
    );
    expect(ok).toBe(true);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { viewCount: { increment: 1 } } }),
    );
  });

  it("returns false when the rate limit is exhausted (no increment)", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const db = {
      userRoadmap: {
        findFirst: vi.fn().mockResolvedValue({
          id: "r1",
          visibility: "PUBLIC",
          publishedAt: new Date(),
        }),
        updateMany,
      },
    };
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4" });
    for (let i = 0; i < 5; i++) {
      await incrementEngagement(
        db as never,
        { roadmapId: "r1", field: "viewCount" },
        headers,
      );
    }
    const sixth = await incrementEngagement(
      db as never,
      { roadmapId: "r1", field: "viewCount" },
      headers,
    );
    expect(sixth).toBe(false);
    expect(updateMany).toHaveBeenCalledTimes(5);
  });
});
