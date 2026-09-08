import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { getOrCreateIcalToken } from "./index";

const router = createTRPCRouter({ getOrCreateIcalToken });

describe("timetable.getOrCreateIcalToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const dbMock = { userTimetable: { findUnique: vi.fn(), update: vi.fn() } };
    const caller = makeCaller(router.createCaller, dbMock, null);
    await expect(
      caller.getOrCreateIcalToken({ timetableId: "t1" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("refuses to mint a token while the timetable is PRIVATE", async () => {
    const update = vi.fn();
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "u1",
          icalToken: null,
          visibility: "PRIVATE",
        }),
        update,
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(
      caller.getOrCreateIcalToken({ timetableId: "t1" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(update).not.toHaveBeenCalled();
  });

  it("returns the existing token without minting a new one", async () => {
    const update = vi.fn();
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "u1",
          icalToken: "existing-tok",
          visibility: "UNLISTED",
        }),
        update,
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.getOrCreateIcalToken({ timetableId: "t1" });

    expect(result).toEqual({ icalToken: "existing-tok" });
    expect(update).not.toHaveBeenCalled();
  });

  it("mints and persists a token on first use", async () => {
    const update = vi.fn().mockResolvedValue({});
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "u1",
          icalToken: null,
          visibility: "UNLISTED",
        }),
        update,
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.getOrCreateIcalToken({ timetableId: "t1" });

    const minted = update.mock.calls[0]![0] as {
      where: { id: string };
      data: { icalToken: string };
    };
    expect(minted.where).toEqual({ id: "t1" });
    expect(minted.data.icalToken).toEqual(expect.any(String));
    expect(minted.data.icalToken.length).toBeGreaterThan(0);
    // The persisted token is the one handed back to the caller.
    expect(result).toEqual({ icalToken: minted.data.icalToken });
  });

  it("forbids a timetable owned by another user", async () => {
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "someone-else",
          icalToken: null,
          visibility: "UNLISTED",
        }),
        update: vi.fn(),
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(
      caller.getOrCreateIcalToken({ timetableId: "t1" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
