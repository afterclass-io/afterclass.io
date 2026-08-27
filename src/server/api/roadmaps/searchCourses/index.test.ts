import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// vi.mock factories are hoisted above top-level const declarations, so the
// mock fns must be created via vi.hoisted to avoid a TDZ ("Cannot access ...
// before initialization") error - same pattern as `quota.test.ts`.
const { queryRawMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn() as Mock,
}));

// `server-only` is a Next.js build-time guard that throws when imported outside
// a Next.js server bundle. `@/server/api/root` -> timetable router ->
// `getFeedData` imports it, so stub it as a no-op (same pattern as
// `src/server/mcp/caller.test.ts` and `src/mcp/user.test.ts`).
vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: { $queryRaw: queryRawMock },
}));

import type { PrismaClient } from "@prisma/client";

import { createCaller } from "@/server/api/root";

// Mock row shape matches the pre-upgrade procedure output exactly, so the
// roadmap planner UI contract ({ id, code, name, creditUnits }) is pinned.
const statRow = {
  id: "c1",
  code: "STAT101",
  name: "Statistical Analysis",
  creditUnits: 1,
};

const caller = createCaller(() => ({
  db: { $queryRaw: queryRawMock } as unknown as PrismaClient,
  session: null,
  headers: new Headers(),
}));

describe("roadmaps.searchCourses", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
  });

  it("passes the query through to the ranked raw SQL and returns the row", async () => {
    queryRawMock.mockResolvedValue([statRow]);

    const result = await caller.roadmaps.searchCourses({ query: "statistics" });

    expect(queryRawMock).toHaveBeenCalledTimes(1);
    const rawCall = queryRawMock.mock.calls[0] as unknown as [TemplateStringsArray, ...unknown[]];
    const sqlFragments = rawCall[0] as unknown as string[];
    const params = rawCall.slice(1);
    const sql = sqlFragments.join("?");
    expect(sql).toContain("to_tsvector");
    expect(sql).toContain("similarity(");
    expect(sql).toContain("ILIKE");
    expect(sql).toContain("ORDER BY");
    expect(sql).toContain("LIMIT 20");
    expect(params).toContain("statistics");
    // Roadmaps variant intentionally has no professor branch - assert absence
    expect(sql).not.toContain("JOIN professors");
    expect(sql).not.toContain("professor_id");
    expect(result).toEqual([statRow]);
  });

  it("returns [] for a whitespace-only query without hitting the db", async () => {
    const result = await caller.roadmaps.searchCourses({ query: "   " });

    expect(result).toEqual([]);
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("propagates an error when the raw query rejects", async () => {
    queryRawMock.mockRejectedValue(new Error("boom"));

    await expect(caller.roadmaps.searchCourses({ query: "statistics" })).rejects.toThrow(
      "boom",
    );
  });
});
