import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { setActive } from "./index";

const router = createTRPCRouter({ setActive });

describe("roadmaps.setActive", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const dbMock = {
      userRoadmap: { findUnique: vi.fn() },
      $transaction: vi.fn(),
    };
    const caller = makeCaller(router.createCaller, dbMock, null);
    await expect(caller.setActive({ roadmapId: "r1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("clears isActive on the user's other roadmaps and sets it on the target, atomically", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    const update = vi.fn().mockResolvedValue({ id: "r1", isActive: true });
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({ userId: "u1" }),
        updateMany,
        update,
      },
      $transaction: vi.fn().mockResolvedValue([{ count: 2 }, { id: "r1" }]),
    };
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.setActive({ roadmapId: "r1" });

    expect(result).toEqual({ success: true });
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      data: { isActive: false },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { isActive: true },
    });
    expect(dbMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it("forbids activating a roadmap owned by another user", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({ userId: "someone-else" }),
        updateMany: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(caller.setActive({ roadmapId: "r1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it("forbids activating a roadmap that does not exist", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue(null),
        updateMany: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(
      caller.setActive({ roadmapId: "missing" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
