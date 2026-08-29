import { describe, expect, it, vi, beforeEach } from "vitest";

import { createTRPCRouter } from "@/server/api/trpc";
import { syncProgress } from "./index";
import { getCurrentWindowLogic } from "@/server/api/bidWindows/getCurrentWindow/helpers";
import { getCurrentAcadTerm } from "@/common/tools/acad-term";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));
vi.mock("@/server/api/bidWindows/getCurrentWindow/helpers", () => ({
  getCurrentWindowLogic: vi.fn(),
}));
vi.mock("@/common/tools/acad-term", () => ({
  getCurrentAcadTerm: vi.fn(),
}));

const router = createTRPCRouter({ syncProgress });

function makeCaller(dbMock: unknown) {
  return router.createCaller({
    db: dbMock,
    session: { user: { id: "u1" } },
    headers: new Headers(),
  } as never);
}

describe("roadmaps.syncProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentWindowLogic).mockResolvedValue(null);
    vi.mocked(getCurrentAcadTerm).mockResolvedValue(null);
  });

  it("does not sync when the roadmap already has 100 entries", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u1",
          isActive: true,
          matricTermId: "t0",
          updatedAt: new Date(),
        }),
      },
      userRoadmapEntry: {
        findMany: vi.fn().mockResolvedValue(
          Array.from({ length: 100 }, (_, i) => ({
            courseId: `c${i}`,
            sortOrder: i,
          })),
        ),
      },
    };
    const caller = makeCaller(dbMock);
    const result = await caller.syncProgress({ roadmapId: "r1" });
    expect(result.synced).toBe(0);
    expect(dbMock.userRoadmapEntry.findMany).toHaveBeenCalled();
  });

  it("syncs courses atomically via transaction — createMany and updatedAt bump use tx", async () => {
    vi.mocked(getCurrentWindowLogic).mockResolvedValue({
      acadTermId: "t1",
    } as never);
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockResolvedValue({ id: "r1" });
    const tx = {
      userRoadmapEntry: { createMany },
      userRoadmap: { update },
    };
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u1",
          isActive: true,
          matricTermId: "t0",
          updatedAt: new Date(),
        }),
      },
      userRoadmapEntry: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ courseId: "c-old", sortOrder: 0 }]),
      },
      acadTerm: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "t0",
            acadYearStart: 2026,
            term: "1",
            startDt: new Date("2026-08-01T00:00:00Z"),
          },
          {
            id: "t1",
            acadYearStart: 2026,
            term: "2",
            startDt: new Date("2026-11-01T00:00:00Z"),
          },
        ]),
      },
      userTimetable: {
        findMany: vi.fn().mockResolvedValue([
          { acadTermId: "t0", slots: [{ class: { courseId: "c-new" } }] },
          { acadTermId: "t1", slots: [] },
        ]),
      },
      bidWindow: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(tx),
      ),
    };
    const caller = makeCaller(dbMock);
    const result = await caller.syncProgress({ roadmapId: "r1" });

    expect(result.synced).toBe(1);
    expect(result.courseIds).toEqual(["c-new"]);
    expect(dbMock.$transaction).toHaveBeenCalledTimes(1);
    expect(createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ roadmapId: "r1", courseId: "c-new" })],
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { updatedAt: expect.any(Date) as Date },
    });
  });

  it("swallows P2002 from concurrent syncs — transaction boundary catch", async () => {
    vi.mocked(getCurrentWindowLogic).mockResolvedValue({
      acadTermId: "t1",
    } as never);
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u1",
          isActive: true,
          matricTermId: "t0",
          updatedAt: new Date(),
        }),
      },
      userRoadmapEntry: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ courseId: "c-old", sortOrder: 0 }]),
      },
      acadTerm: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "t0",
            acadYearStart: 2026,
            term: "1",
            startDt: new Date("2026-08-01T00:00:00Z"),
          },
          {
            id: "t1",
            acadYearStart: 2026,
            term: "2",
            startDt: new Date("2026-11-01T00:00:00Z"),
          },
        ]),
      },
      userTimetable: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { acadTermId: "t0", slots: [{ class: { courseId: "c-new" } }] },
          ]),
      },
      bidWindow: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(async () => {
        throw Object.assign(new Error("Unique constraint"), { code: "P2002" });
      }),
    };
    const caller = makeCaller(dbMock);
    const result = await caller.syncProgress({ roadmapId: "r1" });
    expect(result).toEqual({ synced: 0, courseIds: [] });
  });

  it("propagates non-P2002 failure — updatedAt bump/slot copy failure rejects (no half-commit)", async () => {
    vi.mocked(getCurrentWindowLogic).mockResolvedValue({
      acadTermId: "t1",
    } as never);
    const createMany = vi.fn().mockRejectedValue(new Error("createMany boom"));
    const update = vi.fn();
    const tx = {
      userRoadmapEntry: { createMany },
      userRoadmap: { update },
    };
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u1",
          isActive: true,
          matricTermId: "t0",
          updatedAt: new Date(),
        }),
      },
      userRoadmapEntry: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ courseId: "c-old", sortOrder: 0 }]),
      },
      acadTerm: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "t0",
            acadYearStart: 2026,
            term: "1",
            startDt: new Date("2026-08-01T00:00:00Z"),
          },
          {
            id: "t1",
            acadYearStart: 2026,
            term: "2",
            startDt: new Date("2026-11-01T00:00:00Z"),
          },
        ]),
      },
      userTimetable: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { acadTermId: "t0", slots: [{ class: { courseId: "c-new" } }] },
          ]),
      },
      bidWindow: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(tx),
      ),
    };
    const caller = makeCaller(dbMock);
    await expect(caller.syncProgress({ roadmapId: "r1" })).rejects.toThrow(
      "createMany boom",
    );
    expect(createMany).toHaveBeenCalled();
    expect(dbMock.$transaction).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
  });
});
