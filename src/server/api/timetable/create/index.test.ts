import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { create } from "./index";

const router = createTRPCRouter({ create });

describe("timetable.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retries with isActive:false when first create hits P2002 (concurrent race)", async () => {
    const count = vi.fn().mockResolvedValue(0);
    const fallbackRow = {
      id: "t2",
      userId: "u1",
      acadTermId: "term-a",
      name: "Plan A",
      isActive: false,
    };
    const createMock = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("Unique"), { code: "P2002" }))
      .mockResolvedValueOnce(fallbackRow);
    const dbMock = {
      userTimetable: { count, create: createMock },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.create({ acadTermId: "term-a" });

    expect(result).toEqual(fallbackRow);
    expect(count).toHaveBeenCalledWith({
      where: { userId: "u1", acadTermId: "term-a" },
    });
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(createMock).toHaveBeenNthCalledWith(1, {
      data: { userId: "u1", acadTermId: "term-a", name: "Plan A", isActive: true },
    });
    expect(createMock).toHaveBeenNthCalledWith(2, {
      data: { userId: "u1", acadTermId: "term-a", name: "Plan A", isActive: false },
    });
  });

  it("preserves explicit name on P2002 fallback", async () => {
    const count = vi.fn().mockResolvedValue(1);
    const fallbackRow = {
      id: "t3",
      userId: "u1",
      acadTermId: "term-a",
      name: "My Plan",
      isActive: false,
    };
    const createMock = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("Unique"), { code: "P2002" }))
      .mockResolvedValueOnce(fallbackRow);
    const dbMock = {
      userTimetable: { count, create: createMock },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.create({ acadTermId: "term-a", name: "My Plan" });

    expect(result).toEqual(fallbackRow);
    expect(createMock).toHaveBeenNthCalledWith(1, {
      data: { userId: "u1", acadTermId: "term-a", name: "My Plan", isActive: false },
    });
    expect(createMock).toHaveBeenNthCalledWith(2, {
      data: { userId: "u1", acadTermId: "term-a", name: "My Plan", isActive: false },
    });
  });

  it("propagates non-P2002 errors", async () => {
    const count = vi.fn().mockResolvedValue(0);
    const createMock = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("boom"), { code: "P2003" }));
    const dbMock = {
      userTimetable: { count, create: createMock },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(caller.create({ acadTermId: "term-a" })).rejects.toThrow("boom");
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("propagates generic errors without code", async () => {
    const count = vi.fn().mockResolvedValue(0);
    const createMock = vi.fn().mockRejectedValue(new Error("generic boom"));
    const dbMock = {
      userTimetable: { count, create: createMock },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(caller.create({ acadTermId: "term-a" })).rejects.toThrow("generic boom");
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
