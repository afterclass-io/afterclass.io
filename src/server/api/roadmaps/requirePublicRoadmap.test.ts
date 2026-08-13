import { describe, expect, it, vi } from "vitest";
import { requirePublicRoadmap } from "./requirePublicRoadmap";

describe("requirePublicRoadmap", () => {
  it("returns the roadmap when it is PUBLIC and published", async () => {
    const db = {
      userRoadmap: {
        findFirst: vi.fn().mockResolvedValue({
          id: "r1",
          visibility: "PUBLIC",
          publishedAt: new Date(),
        }),
      },
    };
    const roadmap = await requirePublicRoadmap(db as never, "r1");
    expect(roadmap.id).toBe("r1");
    expect(db.userRoadmap.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "r1",
          visibility: "PUBLIC",
          publishedAt: { not: null },
        },
      }),
    );
  });

  it("throws NOT_FOUND for PRIVATE/UNLISTED or unpublished roadmaps", async () => {
    const db = {
      userRoadmap: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    await expect(
      requirePublicRoadmap(db as never, "r1"),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
