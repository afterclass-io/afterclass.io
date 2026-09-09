import { describe, expect, it, vi, beforeEach } from "vitest";

// Cross-user isolation: user A (session u1) must not be able to read or
// write user B's (u2) timetables. These procedures scope the lookup to
// (id, userId) so B's row resolves to null → NOT_FOUND, and no write runs.
// Pure mock-db — no live Postgres.
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

import { createTRPCRouter } from "@/server/api/trpc";
import { remove } from "./remove";
import { addSlot } from "./addSlot";

const router = createTRPCRouter({ remove, addSlot });

function makeCaller(dbMock: unknown) {
  return router.createCaller({
    db: dbMock,
    session: { user: { id: "u1" } },
    headers: new Headers(),
  } as never);
}

describe("timetable cross-user isolation (A=u1 cannot touch B=u2 rows)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("remove on B's timetable id → NOT_FOUND, row unchanged", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const del = vi.fn();
    const dbMock = {
      userTimetable: { findUnique, delete: del },
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.remove({ timetableId: "t-of-B" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    // Lookup itself is scoped to A's rows — B's id can never resolve.
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "t-of-B", userId: "u1" },
    });
    expect(del).not.toHaveBeenCalled();
  });

  it("addSlot on B's timetable id → NOT_FOUND, no slot created", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const createMany = vi.fn();
    const dbMock = {
      userTimetable: { findUnique },
      classes: { findUnique: vi.fn() },
      userTimetableSlot: { createMany },
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.addSlot({ timetableId: "t-of-B", classId: "c1" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "t-of-B", userId: "u1" } }),
    );
    expect(createMany).not.toHaveBeenCalled();
  });
});
