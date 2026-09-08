import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { saveEntries } from "./index";

const router = createTRPCRouter({ saveEntries });

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
    const caller = makeCaller(router.createCaller, dbMock);
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
    const caller = makeCaller(router.createCaller, dbMock);
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
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(
      caller.saveEntries({
        roadmapId: "r1",
        updatedAt: "2026-07-01T00:00:00.000Z",
        entries: [entry],
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it.each([
    ["the roadmap does not exist", null],
    ["the roadmap belongs to another user", { id: "r1", userId: "u2", updatedAt: new Date() }],
  ])("forbids saving when %s", async (_label, row) => {
    const dbMock = {
      userRoadmap: { findUnique: vi.fn().mockResolvedValue(row) },
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(
      caller.saveEntries({ roadmapId: "r1", entries: [entry] }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("replaces the roadmap's entries in one transaction and returns the bumped version", async () => {
    const bumped = new Date("2026-08-02T10:00:00Z");
    const deleteMany = vi.fn().mockResolvedValue({ count: 3 });
    const createMany = vi.fn().mockResolvedValue({ count: 2 });
    const update = vi.fn().mockResolvedValue({ updatedAt: bumped });
    const tx = { userRoadmapEntry: { deleteMany, createMany }, userRoadmap: { update } };
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u1",
          updatedAt: new Date("2026-08-01T00:00:00Z"),
        }),
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
    };
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.saveEntries({
      roadmapId: "r1",
      entries: [entry, { ...entry, courseId: "c2", sortOrder: 1 }],
    });

    expect(result).toEqual({ count: 2, updatedAt: bumped });
    expect(deleteMany).toHaveBeenCalledWith({ where: { roadmapId: "r1" } });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { ...entry, roadmapId: "r1" },
        { ...entry, courseId: "c2", sortOrder: 1, roadmapId: "r1" },
      ],
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { updatedAt: expect.any(Date) as Date },
      select: { updatedAt: true },
    });
  });

  it.each([
    ["P2002", "CONFLICT"],
    ["P2003", "BAD_REQUEST"],
  ])("maps Prisma %s from the transaction to %s", async (prismaCode, trpcCode) => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u1",
          updatedAt: new Date("2026-08-01T00:00:00Z"),
        }),
      },
      $transaction: vi.fn().mockRejectedValue(
        Object.assign(new Error("prisma boom"), { code: prismaCode }),
      ),
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(
      caller.saveEntries({ roadmapId: "r1", entries: [entry] }),
    ).rejects.toMatchObject({ code: trpcCode });
  });

  it("rethrows a non-Prisma transaction failure unchanged", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u1",
          updatedAt: new Date("2026-08-01T00:00:00Z"),
        }),
      },
      $transaction: vi.fn().mockRejectedValue(new Error("network gone")),
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(
      caller.saveEntries({ roadmapId: "r1", entries: [entry] }),
    ).rejects.toThrow("network gone");
  });
});
