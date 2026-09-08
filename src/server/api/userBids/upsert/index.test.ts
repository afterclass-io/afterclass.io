import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { upsert } from "./index";

const router = createTRPCRouter({ upsert });

describe("userBids.upsert", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses a single native upsert keyed by (userId, classId, bidWindowId)", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ id: "b1" });
    const caller = makeCaller(router.createCaller, { userBid: { upsert: upsertMock } });

    const result = await caller.upsert({
      classId: "c1",
      bidWindowId: 2,
      bidAmount: 100,
      notes: "hi",
    });

    expect(result).toEqual({ id: "b1" });
    expect(upsertMock).toHaveBeenCalledWith({
      where: {
        userId_classId_bidWindowId: {
          userId: "u1",
          classId: "c1",
          bidWindowId: 2,
        },
      },
      update: { bidAmount: 100, notes: "hi" },
      create: {
        userId: "u1",
        classId: "c1",
        bidWindowId: 2,
        bidAmount: 100,
        notes: "hi",
        status: "PLANNED",
      },
    });
  });

  it("does not touch status when updating an existing bid", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ id: "b1" });
    const caller = makeCaller(router.createCaller, { userBid: { upsert: upsertMock } });

    await caller.upsert({ classId: "c1", bidWindowId: 2, bidAmount: 50 });

    const call = upsertMock.mock.calls[0]![0] as {
      update: Record<string, unknown>;
    };
    expect(call.update).not.toHaveProperty("status");
    expect(call.update).toEqual({ bidAmount: 50, notes: undefined });
  });
});
