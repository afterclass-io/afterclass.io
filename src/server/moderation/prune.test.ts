import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ updateMany: vi.fn() }));
vi.mock("@/server/db", () => ({
  db: { moderationLog: { updateMany: m.updateMany } },
}));

import { pruneModerationLogText } from "./prune";

beforeEach(() => vi.clearAllMocks());

describe("pruneModerationLogText", () => {
  it("clears only removed text older than the retention period", async () => {
    m.updateMany.mockResolvedValue({ count: 4 });
    const now = new Date("2026-10-06T00:00:00Z");

    await expect(pruneModerationLogText(90, now)).resolves.toEqual({
      cleared: 4,
    });

    expect(m.updateMany).toHaveBeenCalledWith({
      where: {
        removedText: { not: null },
        createdAt: { lt: new Date("2026-07-08T00:00:00Z") },
      },
      data: { removedText: null },
    });
  });
});
