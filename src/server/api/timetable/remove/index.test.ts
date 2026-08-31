import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { remove } from "./index";

const router = createTRPCRouter({ remove });

describe("timetable.remove", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const dbMock = { userTimetable: { findUnique: vi.fn(), delete: vi.fn() } };
    const caller = makeCaller(router.createCaller, dbMock, null);
    await expect(caller.remove({ timetableId: "t1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("deletes an owned timetable", async () => {
    const del = vi.fn().mockResolvedValue({ id: "t1" });
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({ id: "t1", userId: "u1" }),
        delete: del,
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.remove({ timetableId: "t1" });

    expect(result).toEqual({ success: true });
    expect(dbMock.userTimetable.findUnique).toHaveBeenCalledWith({
      where: { id: "t1", userId: "u1" },
    });
    expect(del).toHaveBeenCalledWith({ where: { id: "t1" } });
  });

  it("throws NOT_FOUND when the timetable is missing or not owned", async () => {
    // findUnique scopes on { id, userId }, so another user's row reads as null.
    const del = vi.fn();
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue(null),
        delete: del,
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(caller.remove({ timetableId: "t1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(del).not.toHaveBeenCalled();
  });
});
