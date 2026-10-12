import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { UniversityAbbreviation } from "@/generated/prisma/enums";

import { searchCourses, searchProfessors } from "./search-service";

const queryRawMock = vi.fn();
const mockDb = {
  $queryRaw: queryRawMock,
} as unknown as PrismaClient;

const courseRowDefaults = {
  id: "c1",
  code: "IS216",
  name: "Web App",
  creditUnits: 1,
  uniAbbrv: UniversityAbbreviation.SMU,
  count: 1n,
};

function makeCourseRow(
  overrides: Partial<typeof courseRowDefaults> & {
    profCount?: number;
    reviewCount?: number;
  } = {},
) {
  return { ...courseRowDefaults, ...overrides };
}

const professorRowDefaults = {
  id: "p1",
  slug: "goh-jing-rong",
  name: "Goh, Jing Rong",
  uniAbbrv: UniversityAbbreviation.SMU,
  count: 1n,
  courseCount: 2,
  reviewCount: 3,
};

function makeProfessorRow(
  overrides: Partial<typeof professorRowDefaults> = {},
) {
  return { ...professorRowDefaults, ...overrides };
}

describe("search-service", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
  });

  describe("searchCourses", () => {
    it("returns { rows: [], total: 0 } and does not call $queryRaw for query 'a' with no scope", async () => {
      const result = await searchCourses(mockDb, { query: "a", limit: 10 });
      expect(result).toEqual({ rows: [], total: 0 });
      expect(queryRawMock).not.toHaveBeenCalled();
    });

    it("does not call $queryRaw for query '&&&' with no scope", async () => {
      const result = await searchCourses(mockDb, { query: "&&&", limit: 10 });
      expect(result).toEqual({ rows: [], total: 0 });
      expect(queryRawMock).not.toHaveBeenCalled();
    });

    it("calls $queryRaw exactly once for a normal search, including when withCounts is true", async () => {
      queryRawMock.mockResolvedValue([
        makeCourseRow({
          name: "Web Application Development II",
          profCount: 2,
          reviewCount: 5,
        }),
      ]);

      const result = await searchCourses(mockDb, {
        query: "web",
        limit: 10,
        withCounts: true,
      });

      expect(queryRawMock).toHaveBeenCalledTimes(1);
      expect(result.rows).toHaveLength(1);
    });

    it("constructs SQL containing expected fragments and never contains plainto_tsquery", async () => {
      queryRawMock.mockResolvedValue([]);

      await searchCourses(mockDb, { query: "intro", limit: 10 });

      expect(queryRawMock).toHaveBeenCalledTimes(1);
      const rawCall = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
      const sql = rawCall[0].join("?");

      expect(sql).toContain("to_tsquery('simple', ?::text)");
      expect(sql).toContain("COUNT(*) OVER ()");
      expect(sql).toContain("word_similarity(c.name");
      expect(sql).toContain("similarity(c.code");
      expect(sql).toContain("FROM classes clp");
      expect(sql).toContain("JOIN professors p ON p.id = clp.professor_id");
      expect(sql).toContain("ILIKE");
      expect(sql).not.toContain("plainto_tsquery");
    });

    it("binds 'intro:* & to:* & computing:*' and caller-supplied limit (e.g. 5, 20)", async () => {
      queryRawMock.mockResolvedValue([]);

      await searchCourses(mockDb, { query: "intro to computing", limit: 5 });
      let rawCall = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
      let params = rawCall.slice(1);
      expect(params).toContain("intro:* & to:* & computing:*");
      expect(params).toContain(5);

      queryRawMock.mockClear();
      await searchCourses(mockDb, { query: "intro to computing", limit: 20 });
      rawCall = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
      params = rawCall.slice(1);
      expect(params).toContain("intro:* & to:* & computing:*");
      expect(params).toContain(20);
    });

    it("binds 'CORSTAT1202' for query 'COR STAT 1202'", async () => {
      queryRawMock.mockResolvedValue([]);

      await searchCourses(mockDb, { query: "COR STAT 1202", limit: 10 });

      const rawCall = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
      const params = rawCall.slice(1);
      expect(params).toContain("CORSTAT1202");
    });

    it("binds '100\\%' for query '100%'", async () => {
      queryRawMock.mockResolvedValue([]);

      await searchCourses(mockDb, { query: "100%", limit: 10 });

      const rawCall = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
      const params = rawCall.slice(1);
      expect(params).toContain("100\\%");
    });

    it("returns profCount: 0 and reviewCount: 0 when withCounts is false", async () => {
      queryRawMock.mockResolvedValue([
        makeCourseRow({
          profCount: 4,
          reviewCount: 9,
        }),
      ]);

      const result = await searchCourses(mockDb, {
        query: "web",
        limit: 10,
        withCounts: false,
      });

      expect(result.rows[0]?.profCount).toBe(0);
      expect(result.rows[0]?.reviewCount).toBe(0);
    });

    it("returns mapped profCount and reviewCount when withCounts is true", async () => {
      queryRawMock.mockResolvedValue([
        makeCourseRow({
          profCount: 4,
          reviewCount: 9,
        }),
      ]);

      const result = await searchCourses(mockDb, {
        query: "web",
        limit: 10,
        withCounts: true,
      });

      expect(result.rows[0]?.profCount).toBe(4);
      expect(result.rows[0]?.reviewCount).toBe(9);
    });

    it("maps total correctly from bigint count of 37n", async () => {
      queryRawMock.mockResolvedValue([
        makeCourseRow({
          code: "STAT101",
          name: "Stats",
          count: 37n,
        }),
      ]);

      const result = await searchCourses(mockDb, {
        query: "statistics",
        limit: 10,
      });

      expect(result.total).toBe(37);
    });

    it("applies exact-code short circuit: rows IS216, IS211, IS214 for query IS216 return only IS216 with total 1", async () => {
      queryRawMock.mockResolvedValue([
        makeCourseRow({
          name: "Web Development",
          count: 3n,
        }),
        makeCourseRow({
          id: "c2",
          code: "IS211",
          name: "Algorithms",
          count: 3n,
        }),
        makeCourseRow({
          id: "c3",
          code: "IS214",
          name: "Database Systems",
          count: 3n,
        }),
      ]);

      const result = await searchCourses(mockDb, {
        query: "IS216",
        limit: 10,
      });

      expect(result.rows.map((r) => r.code)).toEqual(["IS216"]);
      expect(result.total).toBe(1);
    });

    it("applies exact-code dash match: rows COR-STAT1202, COR-STAT1203 for query COR STAT1202 return only COR-STAT1202", async () => {
      queryRawMock.mockResolvedValue([
        makeCourseRow({
          code: "COR-STAT1202",
          name: "Stats 1",
          count: 2n,
        }),
        makeCourseRow({
          id: "c2",
          code: "COR-STAT1203",
          name: "Stats 2",
          count: 2n,
        }),
      ]);

      const result = await searchCourses(mockDb, {
        query: "COR STAT1202",
        limit: 10,
      });

      expect(result.rows.map((r) => r.code)).toEqual(["COR-STAT1202"]);
      expect(result.total).toBe(1);
    });

    it("executes browse mode when query is empty with a scope, binding hasQuery as false", async () => {
      queryRawMock.mockResolvedValue([]);

      await searchCourses(mockDb, {
        query: "",
        limit: 10,
        scope: { professorSlug: "x" },
      });

      expect(queryRawMock).toHaveBeenCalledTimes(1);
      const rawCall = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
      const params = rawCall.slice(1);
      expect(params).toContain(false); // hasQuery is false
      expect(params).toContain("x"); // professorSlug
    });
  });

  describe("searchProfessors", () => {
    it("returns { rows: [], total: 0 } and does not call $queryRaw for query 'a' with no scope", async () => {
      const result = await searchProfessors(mockDb, { query: "a", limit: 10 });
      expect(result).toEqual({ rows: [], total: 0 });
      expect(queryRawMock).not.toHaveBeenCalled();
    });

    it("does not call $queryRaw for query '&&&' with no scope", async () => {
      const result = await searchProfessors(mockDb, {
        query: "&&&",
        limit: 10,
      });
      expect(result).toEqual({ rows: [], total: 0 });
      expect(queryRawMock).not.toHaveBeenCalled();
    });

    it("calls $queryRaw exactly once for a normal search and includes professor SQL fragments", async () => {
      queryRawMock.mockResolvedValue([makeProfessorRow()]);

      const result = await searchProfessors(mockDb, {
        query: "goh",
        limit: 10,
        withCounts: true,
      });

      expect(queryRawMock).toHaveBeenCalledTimes(1);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.courseCount).toBe(2);
      expect(result.rows[0]?.reviewCount).toBe(3);

      const rawCall = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
      const sql = rawCall[0].join("?");
      const params = rawCall.slice(1);

      expect(sql).toContain("FROM professors p");
      expect(sql).toContain("unnest(p.boss_aliases)");
      expect(sql).toContain("REPLACE(p.name");
      expect(sql).toContain("COUNT(*) OVER ()");
      expect(params).toContain("goh:*");
    });

    it("returns courseCount: 0 and reviewCount: 0 when withCounts is false", async () => {
      queryRawMock.mockResolvedValue([
        makeProfessorRow({
          courseCount: 4,
          reviewCount: 7,
        }),
      ]);

      const result = await searchProfessors(mockDb, {
        query: "goh",
        limit: 10,
        withCounts: false,
      });

      expect(result.rows[0]?.courseCount).toBe(0);
      expect(result.rows[0]?.reviewCount).toBe(0);
    });

    it("binds 'ada:* & lovelace:*' and caller-supplied limit for professor multi-word queries", async () => {
      queryRawMock.mockResolvedValue([]);

      await searchProfessors(mockDb, { query: "ada lovelace", limit: 3 });

      const rawCall = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
      const params = rawCall.slice(1);
      expect(params).toContain("ada:* & lovelace:*");
      expect(params).toContain(3);
    });

    it("executes browse mode when query is empty with courseCode scope, binding hasQuery as false", async () => {
      queryRawMock.mockResolvedValue([]);

      await searchProfessors(mockDb, {
        query: "",
        limit: 10,
        scope: { courseCode: "IS216" },
      });

      expect(queryRawMock).toHaveBeenCalledTimes(1);
      const rawCall = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
      const params = rawCall.slice(1);
      expect(params).toContain(false); // hasQuery is false
      expect(params).toContain("IS216"); // courseCode
    });
  });
});
