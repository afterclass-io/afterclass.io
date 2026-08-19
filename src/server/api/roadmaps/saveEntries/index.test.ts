import { describe, expect, it, vi, beforeEach } from "vitest";

// The Prisma client must never be instantiated in tests: mock the db module
// used by trpc.ts at import time. Also mock transitive dependencies pulled
// by @/server/api/trpc (same pattern as isEmailTaken/index.test.ts).
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

import { createTRPCRouter } from "@/server/api/trpc";
import { saveEntries } from "./index";

const router = createTRPCRouter({ saveEntries });

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

describe("roadmaps.saveEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects duplicate courseIds in the payload", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u1",
          updatedAt: new Date("2026-08-01T00:00:00Z"),
        }),
      },
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.saveEntries({
        roadmapId: "r1",
        entries: [entry, { ...entry, sortOrder: 1 }],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects more than 100 entries", async () => {
    // dbMock still required because protectedProcedure middleware runs before
    // input validation is surfaced as BAD_REQUEST — but Zod's .max(100) rejects
    // before any DB call. Provide a minimal mock to satisfy createCaller.
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u1",
          updatedAt: new Date("2026-08-01T00:00:00Z"),
        }),
      },
    };
    const caller = makeCaller(dbMock);
    const entries = Array.from({ length: 101 }, (_, i) => ({
      courseId: `c${i}`,
      term: "T1" as const,
      yearNumber: 1,
      sortOrder: i % 100,
    }));
    await expect(
      caller.saveEntries({ roadmapId: "r1", entries }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects when the roadmap was changed elsewhere (stale updatedAt)", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u1",
          updatedAt: new Date("2026-08-01T00:00:00Z"),
        }),
      },
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.saveEntries({
        roadmapId: "r1",
        updatedAt: "2026-07-01T00:00:00.000Z",
        entries: [entry],
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
