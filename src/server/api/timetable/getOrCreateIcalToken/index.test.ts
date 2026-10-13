import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

import { createTRPCRouter } from "@/server/api/trpc";
import { getOrCreateIcalToken } from "./index";

const router = createTRPCRouter({ getOrCreateIcalToken });

function makeCaller(dbMock: unknown) {
  return router.createCaller({
    db: dbMock,
    session: { user: { id: "u1" } },
    headers: new Headers(),
  } as never);
}

describe("timetable.getOrCreateIcalToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("scopes the token write to the caller's timetable (TOCTOU hardening)", async () => {
    const update = vi.fn().mockResolvedValue({ icalToken: "tok" });
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "u1",
          icalToken: null,
          visibility: "UNLISTED",
          acadTerm: { endDt: new Date(Date.now() + 86_400_000) },
        }),
        update,
      },
    };
    const caller = makeCaller(dbMock);
    await caller.getOrCreateIcalToken({ timetableId: "t1" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "t1", userId: "u1" } }),
    );
  });

  it("refuses an ended term with BAD_REQUEST and makes no update call", async () => {
    const update = vi.fn();
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "u1",
          icalToken: null,
          visibility: "UNLISTED",
          acadTerm: { endDt: new Date(Date.now() - 86_400_000) },
        }),
        update,
      },
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.getOrCreateIcalToken({ timetableId: "t1" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message:
        "This term has ended, so a calendar link can no longer be created",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses an ended term even when a token already exists", async () => {
    const update = vi.fn();
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "u1",
          icalToken: "existing-token",
          visibility: "UNLISTED",
          acadTerm: { endDt: new Date(Date.now() - 86_400_000) },
        }),
        update,
      },
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.getOrCreateIcalToken({ timetableId: "t1" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message:
        "This term has ended, so a calendar link can no longer be created",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses PRIVATE timetables with BAD_REQUEST", async () => {
    const update = vi.fn();
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "u1",
          icalToken: null,
          visibility: "PRIVATE",
          acadTerm: { endDt: new Date(Date.now() + 86_400_000) },
        }),
        update,
      },
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.getOrCreateIcalToken({ timetableId: "t1" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message:
        "Set your timetable to link-sharing before creating a calendar link",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("mints for an open term and returns icalToken", async () => {
    const update = vi.fn().mockResolvedValue({ icalToken: "minted-token" });
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "u1",
          icalToken: null,
          visibility: "UNLISTED",
          acadTerm: { endDt: new Date(Date.now() + 86_400_000) },
        }),
        update,
      },
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.getOrCreateIcalToken({ timetableId: "t1" }),
    ).resolves.toEqual({ icalToken: expect.any(String) as string });
    expect(update).toHaveBeenCalledTimes(1);
  });
});
