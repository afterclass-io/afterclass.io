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
});
