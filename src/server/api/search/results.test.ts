import { describe, expect, it, vi } from "vitest";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { searchRouter } from "./router";

// Anonymous callers need the data domain public; setup only.
vi.mock("@/server/ecfg/edge-config", () => ({
  getEdgeConfig: () =>
    Promise.resolve({ publicData: { courses: true, professors: true } }),
}));

const service = vi.hoisted(() => ({ courses: vi.fn(), professors: vi.fn() }));
vi.mock("@/server/search/search-service", async (original) => ({
  ...(await original<object>()),
  searchCourses: service.courses,
  searchProfessors: service.professors,
}));

describe("search result pagination", () => {
  it("rejects invalid pagination and oversized queries", async () => {
    const caller = makeCaller(searchRouter.createCaller, {}, null);
    for (const input of [
      { query: "Singapore", cursor: -1 },
      { query: "Singapore", cursor: 0.5 },
      { query: "Singapore", limit: 51 },
      { query: "Singapore", limit: 0 },
      { query: "x".repeat(201) },
    ]) {
      await expect(caller.courseResults(input as never)).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
      await expect(
        caller.professorResults(input as never),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
  });

  it("uses existing services with SMU, 20 rows and session-derived statistics", async () => {
    service.courses.mockResolvedValue({ rows: [], total: 0 });
    service.professors.mockResolvedValue({ rows: [], total: 0 });
    for (const session of [null, { user: { id: "u1" } }]) {
      const caller = makeCaller(searchRouter.createCaller, {}, session);
      expect(await caller.courseResults({ query: "Singapore" })).toEqual({
        rows: [],
        total: 0,
        nextCursor: null,
      });
      await caller.professorResults({ query: "Singapore" });
      for (const mock of [service.courses, service.professors])
        expect(mock).toHaveBeenLastCalledWith(expect.anything(), {
          query: "Singapore",
          cursor: 0,
          limit: 20,
          universityAbbrv: "SMU",
          withCounts: Boolean(session),
        });
    }
  });
  it("returns the next offset and keeps totals on an empty page", async () => {
    const caller = makeCaller(searchRouter.createCaller, {}, null);
    service.courses.mockResolvedValueOnce({
      rows: [
        {
          code: "IS216",
          name: "Test",
          uniAbbrv: "SMU",
          profCount: 0,
          reviewCount: 0,
        },
      ],
      total: 25,
    });
    expect(
      await caller.courseResults({ query: "IS", cursor: 20 }),
    ).toMatchObject({ total: 25, nextCursor: 21 });
    service.courses.mockResolvedValueOnce({ rows: [], total: 25 });
    expect(await caller.courseResults({ query: "IS", cursor: 100 })).toEqual({
      rows: [],
      total: 25,
      nextCursor: null,
    });
  });
});
