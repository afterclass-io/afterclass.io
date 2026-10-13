import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

import { createTRPCRouter } from "@/server/api/trpc";
import { rotateIcalToken } from "./index";

const router = createTRPCRouter({ rotateIcalToken });

function makeCaller(dbMock: unknown, userId = "u1") {
  return router.createCaller({
    db: dbMock,
    session: { user: { id: userId } },
    headers: new Headers(),
  } as never);
}

describe("timetable.rotateIcalToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mints a new token that differs from the old one", async () => {
    const oldToken = "old-token-value";
    const update = vi
      .fn()
      .mockImplementation(({ data }: { data: { icalToken: string } }) =>
        Promise.resolve({ icalToken: data.icalToken }),
      );
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "u1",
          icalToken: oldToken,
          visibility: "UNLISTED",
          acadTerm: { endDt: new Date(Date.now() + 86_400_000) },
        }),
        update,
      },
    };
    const caller = makeCaller(dbMock);
    const result = await caller.rotateIcalToken({ timetableId: "t1" });

    expect(result.icalToken).toBeDefined();
    expect(result.icalToken).not.toBe(oldToken);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { icalToken: result.icalToken },
      }),
    );
  });

  it("scopes the token write to the caller's timetable (TOCTOU hardening)", async () => {
    const update = vi.fn().mockResolvedValue({ icalToken: "new-tok" });
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "u1",
          icalToken: "old-tok",
          visibility: "UNLISTED",
          acadTerm: { endDt: new Date(Date.now() + 86_400_000) },
        }),
        update,
      },
    };
    const caller = makeCaller(dbMock);
    await caller.rotateIcalToken({ timetableId: "t1" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "t1", userId: "u1" } }),
    );
  });

  it("rejects another user's timetable with FORBIDDEN", async () => {
    const update = vi.fn();
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "other-user",
          icalToken: "old-tok",
          visibility: "UNLISTED",
          acadTerm: { endDt: new Date(Date.now() + 86_400_000) },
        }),
        update,
      },
    };
    const caller = makeCaller(dbMock, "u1");
    await expect(
      caller.rotateIcalToken({ timetableId: "t1" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses PRIVATE timetables with BAD_REQUEST", async () => {
    const update = vi.fn();
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "u1",
          icalToken: "old-tok",
          visibility: "PRIVATE",
          acadTerm: { endDt: new Date(Date.now() + 86_400_000) },
        }),
        update,
      },
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.rotateIcalToken({ timetableId: "t1" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message:
        "Set your timetable to link-sharing before creating a calendar link",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses an ended term with BAD_REQUEST and makes no update call", async () => {
    const update = vi.fn();
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "u1",
          icalToken: "old-tok",
          visibility: "UNLISTED",
          acadTerm: { endDt: new Date(Date.now() - 86_400_000) },
        }),
        update,
      },
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.rotateIcalToken({ timetableId: "t1" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message:
        "This term has ended, so a calendar link can no longer be created",
    });
    expect(update).not.toHaveBeenCalled();
  });
});
