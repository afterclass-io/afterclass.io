import { describe, expect, it, vi } from "vitest";

import type { Prisma } from "@/generated/prisma/client";
import { hideRoadmap, hideTimetable } from "./hide";

const asDb = (db: unknown) => db as Prisma.TransactionClient;

describe("hideRoadmap", () => {
  it("makes the roadmap private and clears slug, publish date and share token", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    await hideRoadmap(asDb({ userRoadmap: { updateMany } }), "r1");
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: {
        visibility: "PRIVATE",
        slug: null,
        publishedAt: null,
        shareToken: null,
      },
    });
  });

  it("does not throw when the roadmap no longer exists", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    await expect(
      hideRoadmap(asDb({ userRoadmap: { updateMany } }), "gone"),
    ).resolves.toBeUndefined();
  });
});

describe("hideTimetable", () => {
  it("makes the timetable private and clears the share link and calendar feed token", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    await hideTimetable(asDb({ userTimetable: { updateMany } }), "t1");
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { visibility: "PRIVATE", shareToken: null, icalToken: null },
    });
  });

  it("does not throw when the timetable no longer exists", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    await expect(
      hideTimetable(asDb({ userTimetable: { updateMany } }), "gone"),
    ).resolves.toBeUndefined();
  });
});
