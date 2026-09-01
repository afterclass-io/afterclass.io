import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// vi.mock factories are hoisted above top-level const declarations, so the
// mock fns must be created via vi.hoisted to avoid a TDZ ("Cannot access ...
// before initialization") error - same pattern as `searchCourses/index.test.ts`.
const { queryRawMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn() as Mock,
}));

// `server-only` is a Next.js build-time guard that throws when imported outside
// a Next.js server bundle. `@/server/api/root` imports it transitively, so stub
// it as a no-op (same pattern as `src/server/api/timetable/searchCourses/index.test.ts`).
vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: {
    $queryRaw: queryRawMock,
  },
}));

import type { PrismaClient } from "@prisma/client";

import { createCaller } from "@/server/api/root";

// Row shape returned by the raw professors search. `count` comes from
// `COUNT(*) OVER ()`, so it is a bigint in Node-postgres.
const profRow = {
  id: "p1",
  slug: "goh-jing-rong",
  name: "GOH Jing Rong",
  count: 1n,
};

const caller = createCaller(() => ({
  db: {
    $queryRaw: queryRawMock,
  } as unknown as PrismaClient,
  session: null,
  headers: new Headers(),
}));

describe("professors.search", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
  });

  it("searches professors by name/alias/slug and returns { rows, count }", async () => {
    queryRawMock.mockResolvedValue([profRow]);

    const result = await caller.professors.search({ query: "GOH, Jing Rong" });

    expect(result).toEqual({
      rows: [{ id: "p1", slug: "goh-jing-rong", name: "GOH Jing Rong" }],
      count: 1,
    });
    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });

  it("passes the normalized query through and includes the alias/trigram clauses", async () => {
    queryRawMock.mockResolvedValue([]);

    await caller.professors.search({ query: "GOH, Jing Rong", limit: 5 });

    const rawCall = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
    const sql = rawCall[0].join("?");
    const params = rawCall.slice(1);
    expect(sql).toContain("FROM professors p");
    expect(sql).toContain("p.name ILIKE");
    expect(sql).toContain("p.slug ILIKE");
    expect(sql).toContain("word_similarity(p.name");
    expect(sql).toContain("unnest(p.boss_aliases)");
    expect(sql).toContain("COUNT(*) OVER ()");
    expect(params).toContain("GOH Jing Rong");
    expect(params).toContain(5);
  });

  it("returns empty { rows, count: 0 } for a single-char query without hitting the db", async () => {
    const result = await caller.professors.search({ query: "a" });

    expect(result).toEqual({ rows: [], count: 0 });
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("applies the default limit of 10", async () => {
    queryRawMock.mockResolvedValue([]);

    await caller.professors.search({ query: "Goh" });

    const rawCall = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
    const params = rawCall.slice(1);
    expect(params).toContain(10);
  });

  it("propagates an error when the raw query rejects", async () => {
    queryRawMock.mockRejectedValue(new Error("boom"));

    await expect(
      caller.professors.search({ query: "Goh" }),
    ).rejects.toThrow("boom");
  });
});
