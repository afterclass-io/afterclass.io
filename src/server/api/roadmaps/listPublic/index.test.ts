import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

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

  function makeCaller(dbMock: unknown) {
    return router.createCaller({
      db: dbMock,
      session: null,
      headers: new Headers(),
    } as never);
  }

  beforeEach(() => vi.clearAllMocks());

  it("orders most-liked by upvoteCount desc via DB orderBy", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const dbMock = {
      userRoadmap: { findMany },
      faculties: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const caller = makeCaller(dbMock);
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
    const caller = makeCaller(dbMock);
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
});
