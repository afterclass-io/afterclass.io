import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// vi.mock factories are hoisted above top-level const declarations, so the
// mock fns must be created via vi.hoisted to avoid a TDZ ("Cannot access ...
// before initialization") error - same pattern as `quota.test.ts`.
const { queryRawMock, classesFindManyMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn() as Mock,
  classesFindManyMock: vi.fn() as Mock,
}));

// `server-only` is a Next.js build-time guard that throws when imported outside
// a Next.js server bundle. `@/server/api/root` -> timetable router ->
// `getFeedData` imports it, so stub it as a no-op (same pattern as
// `src/server/mcp/caller.test.ts` and `src/mcp/user.test.ts`).
vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: {
    $queryRaw: queryRawMock,
    classes: { findMany: classesFindManyMock },
  },
}));

import type { PrismaClient } from "@prisma/client";

import { createCaller } from "@/server/api/root";

// Mock row shape matches the pre-upgrade procedure output exactly, so the
// `course-search` widget contract (which parses `{ results }`) is pinned.
const statRow = {
  id: "c1",
  code: "STAT101",
  name: "Statistical Analysis",
  creditUnits: 1,
};

const caller = createCaller(() => ({
  db: {
    $queryRaw: queryRawMock,
    classes: { findMany: classesFindManyMock },
  } as unknown as PrismaClient,
  session: null,
  headers: new Headers(),
}));

describe("timetable.searchCourses", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
    classesFindManyMock.mockReset();
  });

  it("passes the query through to the ranked raw SQL and returns the row", async () => {
    queryRawMock.mockResolvedValue([statRow]);
    classesFindManyMock.mockResolvedValue([]);

    const result = await caller.timetable.searchCourses({
      acadTermId: "t1",
      query: "statistics",
    });

    expect(queryRawMock).toHaveBeenCalledTimes(1);
    expect(classesFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { acadTermId: "t1", courseId: { in: ["c1"] } },
      }),
    );
    expect(result).toEqual([{ ...statRow, sections: [] }]);
  });

  it("attaches sections from the batched classes query", async () => {
    queryRawMock.mockResolvedValue([statRow]);
    classesFindManyMock.mockResolvedValue([
      {
        id: "cl1",
        courseId: "c1",
        section: "G1",
        professor: { name: "Prof Stats" },
        classTimings: [
          {
            dayOfWeek: 1,
            startTime: new Date("2026-01-01T08:00:00.000Z"),
            endTime: new Date("2026-01-01T09:30:00.000Z"),
            venue: "SOB-A",
          },
        ],
        classExamTimings: [
          {
            date: new Date("2026-05-04T00:00:00.000Z"),
            startTime: new Date("2026-05-04T09:00:00.000Z"),
            endTime: new Date("2026-05-04T11:00:00.000Z"),
            venue: "MPSH",
          },
        ],
      },
    ]);

    const result = await caller.timetable.searchCourses({
      acadTermId: "t1",
      query: "statistics",
    });

    expect(result).toEqual([
      {
        ...statRow,
        sections: [
          {
            classId: "cl1",
            section: "G1",
            professorName: "Prof Stats",
            timings: [
              {
                dayOfWeek: 1,
                startTime: new Date("2026-01-01T08:00:00.000Z"),
                endTime: new Date("2026-01-01T09:30:00.000Z"),
                venue: "SOB-A",
              },
            ],
            examTimings: [
              {
                date: new Date("2026-05-04T00:00:00.000Z"),
                startTime: new Date("2026-05-04T09:00:00.000Z"),
                endTime: new Date("2026-05-04T11:00:00.000Z"),
                venue: "MPSH",
              },
            ],
          },
        ],
      },
    ]);
  });

  it("passes professor-name matching through to the ranked raw SQL (same acad term)", async () => {
    queryRawMock.mockResolvedValue([statRow]);
    classesFindManyMock.mockResolvedValue([]);

    const result = await caller.timetable.searchCourses({
      acadTermId: "t1",
      query: "Tan",
    });

    expect(queryRawMock).toHaveBeenCalledTimes(1);
    // The ranked raw SQL must still include the professor-name branch, scoped
    // to the same acad term (mirrors the pre-upgrade `classes.some({
    // acadTermId, professor: { name: contains } })` branch).
    const rawCall = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
    const sqlFragments = rawCall[0];
    const params = rawCall.slice(1);
    const sql = sqlFragments.join("?");
    expect(sql).toContain("FROM classes clp");
    expect(sql).toContain("JOIN professors p ON p.id = clp.professor_id");
    expect(sql).toContain("clp.acad_term_id = ");
    expect(sql).toContain("p.name ILIKE");
    expect(sql).toContain("similarity(p.name");
    expect(params).toContain("t1");
    expect(params).toContain("Tan");
    expect(result).toEqual([{ ...statRow, sections: [] }]);
  });

  it("returns [] for a whitespace-only query without hitting the db", async () => {
    const result = await caller.timetable.searchCourses({
      acadTermId: "t1",
      query: "   ",
    });

    expect(result).toEqual([]);
    expect(queryRawMock).not.toHaveBeenCalled();
    expect(classesFindManyMock).not.toHaveBeenCalled();
  });

  it("propagates an error when the raw query rejects", async () => {
    queryRawMock.mockRejectedValue(new Error("boom"));

    await expect(
      caller.timetable.searchCourses({ acadTermId: "t1", query: "statistics" }),
    ).rejects.toThrow("boom");
  });
});
