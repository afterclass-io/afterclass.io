import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";

import { listPublic } from "./index";
import { listPublicInput } from "./input";

describe("listPublicInput", () => {
  it("applies the default limit", () => {
    const parsed = listPublicInput.parse({});
    expect(parsed.limit).toBe(20);
    expect(parsed.facultyId).toBeUndefined();
    expect(parsed.query).toBeUndefined();
    expect(parsed.sort).toBe("newest");
  });

  it("accepts composable filters", () => {
    const parsed = listPublicInput.parse({
      limit: 10,
      facultyId: 3,
      query: "analytics",
      cursor: "abc",
      sort: "most-viewed",
    });
    expect(parsed).toEqual({
      limit: 10,
      facultyId: 3,
      query: "analytics",
      cursor: "abc",
      sort: "most-viewed",
    });
  });

  it("accepts all gallery sort options", () => {
    for (const sort of ["newest", "most-liked", "most-viewed"] as const) {
      expect(listPublicInput.parse({ sort }).sort).toBe(sort);
    }
  });

  it("rejects unknown sort options", () => {
    expect(() => listPublicInput.parse({ sort: "trending" })).toThrow();
  });

  it("trims query whitespace", () => {
    const parsed = listPublicInput.parse({ query: "  finance  " });
    expect(parsed.query).toBe("finance");
  });

  it("rejects empty query strings", () => {
    expect(() => listPublicInput.parse({ query: "   " })).toThrow();
  });

  it("rejects out-of-range limits", () => {
    expect(() => listPublicInput.parse({ limit: 0 })).toThrow();
    expect(() => listPublicInput.parse({ limit: 51 })).toThrow();
  });
});

describe("listPublic", () => {
  const router = createTRPCRouter({ listPublic });

  beforeEach(() => vi.clearAllMocks());

  it("orders most-liked by upvoteCount desc via DB orderBy", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const dbMock = {
      userRoadmap: { findMany },
      faculties: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const caller = makeCaller(router.createCaller, dbMock, null);
    await caller.listPublic({ sort: "most-liked" });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { upvoteCount: "desc" },
          { publishedAt: "desc" },
          { id: "desc" },
        ],
      }),
    );
  });

  it("uses cursor pagination for most-liked (take limit+1 with skip/cursor)", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const dbMock = {
      userRoadmap: { findMany },
      faculties: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const caller = makeCaller(router.createCaller, dbMock, null);
    await caller.listPublic({ sort: "most-liked", cursor: "c1", limit: 10 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { upvoteCount: "desc" },
          { publishedAt: "desc" },
          { id: "desc" },
        ],
        take: 11,
        skip: 1,
        cursor: { id: "c1" },
      }),
    );
  });

  it.each([
    ["most-viewed", [{ viewCount: "desc" }, { publishedAt: "desc" }, { id: "desc" }]],
    ["newest", [{ publishedAt: "desc" }, { id: "desc" }]],
  ])("orders %s via DB orderBy", async (sort, orderBy) => {
    const findMany = vi.fn().mockResolvedValue([]);
    const dbMock = {
      userRoadmap: { findMany },
      faculties: { findMany: vi.fn() },
    };
    const caller = makeCaller(router.createCaller, dbMock, null);
    await caller.listPublic({ sort: sort as "most-viewed" | "newest" });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy }));
  });

  const roadmapRow = (over: Record<string, unknown>) => ({
    id: "x",
    name: "R",
    description: "d",
    slug: "r",
    facultyId: null,
    visibility: "PUBLIC",
    publishedAt: new Date("2026-01-01T00:00:00Z"),
    viewCount: 0,
    shareCount: 0,
    isActive: false,
    userId: "owner",
    user: { username: "alice" },
    _count: { entries: 3, votes: 2 },
    ...over,
  });

  it("pops the extra row for nextCursor, resolves faculty names, and maps items", async () => {
    const findMany = vi.fn().mockResolvedValue([
      roadmapRow({ id: "r1", facultyId: 10 }),
      roadmapRow({ id: "r2", facultyId: null }),
      roadmapRow({ id: "r3", facultyId: 10 }), // the limit+1 overflow row
    ]);
    const facultiesFindMany = vi
      .fn()
      .mockResolvedValue([{ id: 10, name: "School of Economics", acronym: "SOE" }]);
    const dbMock = {
      userRoadmap: { findMany },
      faculties: { findMany: facultiesFindMany },
    };
    const caller = makeCaller(router.createCaller, dbMock, null);

    const result = await caller.listPublic({
      limit: 2,
      facultyId: 10,
      query: "data",
    });

    // facultyId + query both fold into the where clause.
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          visibility: "PUBLIC",
          publishedAt: { not: null },
          facultyId: 10,
          OR: [
            { name: { contains: "data", mode: "insensitive" } },
            { description: { contains: "data", mode: "insensitive" } },
          ],
        },
        take: 3,
      }),
    );
    // Only the kept faculty ids are looked up (r2's null is filtered out).
    expect(facultiesFindMany).toHaveBeenCalledWith({
      where: { id: { in: [10] } },
      select: { id: true, name: true, acronym: true },
    });

    expect(result.nextCursor).toBe("r2");
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      ownerUsername: "alice",
      entryCount: 3,
      voteCount: 2,
      faculty: { id: 10, name: "School of Economics", acronym: "SOE" },
    });
    expect(result.items[1]!.faculty).toBeNull();
  });

  it("skips the faculty lookup entirely when no kept roadmap has a faculty", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValue([roadmapRow({ id: "r1", facultyId: null })]);
    const facultiesFindMany = vi.fn();
    const dbMock = {
      userRoadmap: { findMany },
      faculties: { findMany: facultiesFindMany },
    };
    const caller = makeCaller(router.createCaller, dbMock, null);

    const result = await caller.listPublic({ limit: 20 });

    expect(facultiesFindMany).not.toHaveBeenCalled();
    expect(result.nextCursor).toBeNull();
    expect(result.items[0]!.faculty).toBeNull();
  });
});
