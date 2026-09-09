import { describe, expect, it, vi, beforeEach } from "vitest";

// Cross-user isolation: user A (session u1) must not be able to read or
// write user B's (u2) roadmaps. Pure mock-db — no live Postgres.
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

import { createTRPCRouter } from "@/server/api/trpc";
import { saveEntries } from "./saveEntries";
import { remove } from "./remove";

const router = createTRPCRouter({ saveEntries, remove });

function makeCaller(dbMock: unknown) {
  return router.createCaller({
    db: dbMock,
    session: { user: { id: "u1" } },
    headers: new Headers(),
  } as never);
}

const entry = {
  courseId: "c1",
  yearNumber: 1,
  term: "T1" as const,
  sortOrder: 0,
};

describe("roadmaps cross-user isolation (A=u1 cannot touch B=u2 rows)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saveEntries on B's roadmap id → FORBIDDEN, rows unchanged", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r-of-B",
          userId: "u2",
          updatedAt: new Date("2026-08-01T00:00:00Z"),
        }),
      },
      $transaction: vi.fn(),
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.saveEntries({ roadmapId: "r-of-B", entries: [entry] }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it("remove on B's roadmap id → FORBIDDEN, row unchanged", async () => {
    const del = vi.fn();
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({ userId: "u2" }),
        delete: del,
      },
    };
    const caller = makeCaller(dbMock);
    await expect(caller.remove({ roadmapId: "r-of-B" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(del).not.toHaveBeenCalled();
  });
});
