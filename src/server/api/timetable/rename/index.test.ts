import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { rename } from "./index";

const router = createTRPCRouter({ rename });

describe("timetable.rename", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const dbMock = { userTimetable: { findUnique: vi.fn(), update: vi.fn() } };
    const caller = makeCaller(router.createCaller, dbMock, null);
    await expect(
      caller.rename({ timetableId: "t1", name: "New" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("renames an owned timetable and returns the updated row", async () => {
    const update = vi.fn().mockResolvedValue({ id: "t1", name: "New" });
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({ id: "t1", userId: "u1" }),
        update,
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.rename({ timetableId: "t1", name: "New" });

    expect(result).toEqual({ id: "t1", name: "New" });
    expect(dbMock.userTimetable.findUnique).toHaveBeenCalledWith({
      where: { id: "t1", userId: "u1" },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { name: "New" },
    });
  });

  it("throws NOT_FOUND when the timetable is missing or not owned", async () => {
    const update = vi.fn();
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue(null),
        update,
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(
      caller.rename({ timetableId: "t1", name: "New" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects an empty name", async () => {
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({ id: "t1", userId: "u1" }),
        update: vi.fn(),
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(
      caller.rename({ timetableId: "t1", name: "" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a name longer than 100 characters", async () => {
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({ id: "t1", userId: "u1" }),
        update: vi.fn(),
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(
      caller.rename({ timetableId: "t1", name: "x".repeat(101) }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
