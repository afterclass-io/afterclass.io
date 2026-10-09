import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ReviewEventType } from "@/generated/prisma/enums";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { track } from "./index";

const router = createTRPCRouter({ track });

// Real crypto — the id is a deterministic uuid v5 of
// (reviewId, eventType, userId, rotatingSaltStartOfHour()). Pin the clock so
// an hour-boundary crossing between two calls in one test can't flake it.
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-27T12:15:00Z"));
});
afterEach(() => vi.useRealTimers());

const upsertMock = () => vi.fn().mockResolvedValue({ id: "row" });
const callArgs = (fn: ReturnType<typeof upsertMock>) =>
  fn.mock.calls[0]![0] as {
    where: { id: string };
    update: Record<string, unknown>;
    create: {
      id: string;
      eventType: string;
      reviewId: string;
      triggeringUserId: string;
    };
  };

describe("reviewEvents.track", () => {
  it("requires an authenticated caller", async () => {
    const dbMock = { reviewEvents: { upsert: vi.fn() } };
    const caller = makeCaller(router.createCaller, dbMock, null);
    await expect(
      caller.track({ reviewId: "rev1", eventType: ReviewEventType.SHARE }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("upserts on a crypto-derived idempotency key (where.id === create.id)", async () => {
    const upsert = upsertMock();
    const caller = makeCaller(router.createCaller, {
      reviewEvents: { upsert },
    });

    await caller.track({ reviewId: "rev1", eventType: ReviewEventType.SHARE });

    const args = callArgs(upsert);
    expect(args.where.id).toBe(args.create.id);
    expect(args.update).toEqual({});
    expect(args.create).toMatchObject({
      eventType: ReviewEventType.SHARE,
      reviewId: "rev1",
      triggeringUserId: "u1",
    });
  });

  it("derives the same key for a repeat event in the same hour (dedup)", async () => {
    const upsert = upsertMock();
    const caller = makeCaller(router.createCaller, {
      reviewEvents: { upsert },
    });

    await caller.track({ reviewId: "rev1", eventType: ReviewEventType.SHARE });
    vi.setSystemTime(new Date("2026-08-27T12:59:00Z")); // still the same hour
    await caller.track({ reviewId: "rev1", eventType: ReviewEventType.SHARE });

    const first = upsert.mock.calls[0]![0] as { where: { id: string } };
    const second = upsert.mock.calls[1]![0] as { where: { id: string } };
    expect(first.where.id).toBe(second.where.id);
  });

  it("derives a distinct key when review, event type, or user differs", async () => {
    const keyFor = async (
      input: { reviewId: string; eventType: ReviewEventType },
      userId: string,
    ) => {
      const upsert = upsertMock();
      const caller = makeCaller(
        router.createCaller,
        { reviewEvents: { upsert } },
        { user: { id: userId } },
      );
      await caller.track(input);
      return callArgs(upsert).where.id;
    };

    const base = await keyFor(
      { reviewId: "rev1", eventType: ReviewEventType.SHARE },
      "u1",
    );
    const otherReview = await keyFor(
      { reviewId: "rev2", eventType: ReviewEventType.SHARE },
      "u1",
    );
    const otherType = await keyFor(
      { reviewId: "rev1", eventType: ReviewEventType.VIEW },
      "u1",
    );
    const otherUser = await keyFor(
      { reviewId: "rev1", eventType: ReviewEventType.SHARE },
      "u2",
    );

    expect(new Set([base, otherReview, otherType, otherUser]).size).toBe(4);
  });
});
