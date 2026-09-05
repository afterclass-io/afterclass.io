import { describe, expect, it, vi, beforeEach } from "vitest";
import { ReviewEventType } from "@prisma/client";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { countEvent } from "./index";

const router = createTRPCRouter({ countEvent });

describe("reviewEvents.countEvent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const dbMock = { reviewEvents: { count: vi.fn() } };
    const caller = makeCaller(router.createCaller, dbMock, null);
    await expect(
      caller.countEvent({ reviewId: "rev1", eventType: ReviewEventType.SHARE }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("counts events scoped to the review and event type", async () => {
    const count = vi.fn().mockResolvedValue(7);
    const caller = makeCaller(router.createCaller, {
      reviewEvents: { count },
    });

    const result = await caller.countEvent({
      reviewId: "rev1",
      eventType: ReviewEventType.SHARE,
    });

    expect(result).toBe(7);
    expect(count).toHaveBeenCalledWith({
      where: { reviewId: "rev1", eventType: ReviewEventType.SHARE },
    });
  });
});
