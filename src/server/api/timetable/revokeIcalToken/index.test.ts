import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { revokeIcalToken } from "./index";

const router = createTRPCRouter({ revokeIcalToken });

describe("timetable.revokeIcalToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const dbMock = { userTimetable: { findUnique: vi.fn(), update: vi.fn() } };
    const caller = makeCaller(router.createCaller, dbMock, null);
    await expect(
      caller.revokeIcalToken({ timetableId: "t1" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("nulls the token on an owned timetable", async () => {
    const update = vi.fn().mockResolvedValue({});
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({ userId: "u1" }),
        update,
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.revokeIcalToken({ timetableId: "t1" });

    expect(result).toEqual({ icalToken: null });
    expect(update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { icalToken: null },
    });
  });

  it("forbids a timetable owned by another user", async () => {
    const update = vi.fn();
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({ userId: "someone-else" }),
        update,
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(
      caller.revokeIcalToken({ timetableId: "t1" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(update).not.toHaveBeenCalled();
  });
});
