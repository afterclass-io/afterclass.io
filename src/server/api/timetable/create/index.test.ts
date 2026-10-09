import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { create } from "./index";

const router = createTRPCRouter({ create });

describe("timetable.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns winning active plan when first create hits P2002 (concurrent race)", async () => {
    const count = vi.fn().mockResolvedValue(0);
    const winningRow = {
      id: "t1",
      userId: "u1",
      acadTermId: "term-a",
      name: "Plan A",
      isActive: true,
    };
    const createMock = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("Unique"), { code: "P2002" }));
    const findFirstMock = vi.fn().mockResolvedValue(winningRow);
    const dbMock = {
      userTimetable: { count, create: createMock, findFirst: findFirstMock },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.create({ acadTermId: "term-a" });

    expect(result).toEqual(winningRow);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { userId: "u1", acadTermId: "term-a", isActive: true },
    });
  });

  it("propagates P2002 when not first create and does not call findFirst", async () => {
    const count = vi.fn().mockResolvedValue(1);
    const createMock = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("Unique"), { code: "P2002" }));
    const findFirstMock = vi.fn();
    const dbMock = {
      userTimetable: { count, create: createMock, findFirst: findFirstMock },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(caller.create({ acadTermId: "term-a" })).rejects.toThrow(
      "Unique",
    );
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("propagates original error when first create hits P2002 but findFirst returns null", async () => {
    const count = vi.fn().mockResolvedValue(0);
    const createMock = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("Unique"), { code: "P2002" }));
    const findFirstMock = vi.fn().mockResolvedValue(null);
    const dbMock = {
      userTimetable: { count, create: createMock, findFirst: findFirstMock },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(caller.create({ acadTermId: "term-a" })).rejects.toThrow(
      "Unique",
    );
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { userId: "u1", acadTermId: "term-a", isActive: true },
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

    await expect(caller.create({ acadTermId: "term-a" })).rejects.toThrow(
      "boom",
    );
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("propagates generic errors without code", async () => {
    const count = vi.fn().mockResolvedValue(0);
    const createMock = vi.fn().mockRejectedValue(new Error("generic boom"));
    const dbMock = {
      userTimetable: { count, create: createMock },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(caller.create({ acadTermId: "term-a" })).rejects.toThrow(
      "generic boom",
    );
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
