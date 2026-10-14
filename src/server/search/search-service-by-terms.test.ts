import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { UniversityAbbreviation } from "@/generated/prisma/enums";

import { searchCoursesByTerms } from "./search-service";

const queryRawMock = vi.fn();
const mockDb = {
  $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => {
    // Model Prisma's SQL-fragment flattening; retain all existing SQL/parameter assertions.
    const sql = Prisma.sql(strings, ...values);
    return queryRawMock(sql.strings, ...sql.values) as Promise<unknown>;
  },
} as unknown as PrismaClient;

const row = (code: string, acadTermId: string) => ({
  id: `id-${code}`,
  code,
  name: `Name ${code}`,
  creditUnits: 1,
  uniAbbrv: UniversityAbbreviation.SMU,
  acadTermId,
});

describe("searchCoursesByTerms", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
  });

  it("returns empty rows per term without a query for 'a' or '&&&'", async () => {
    for (const query of ["a", "&&&"]) {
      const result = await searchCoursesByTerms(mockDb, {
        query,
        limitPerTerm: 20,
        acadTermIds: ["t1", "t2"],
      });
      expect(result).toEqual([
        { acadTermId: "t1", rows: [] },
        { acadTermId: "t2", rows: [] },
      ]);
    }
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("runs one query with a per-term window and binds the term ids and cap", async () => {
    queryRawMock.mockResolvedValue([]);

    await searchCoursesByTerms(mockDb, {
      query: "statistics",
      limitPerTerm: 20,
      acadTermIds: ["t1", "t2"],
    });

    expect(queryRawMock).toHaveBeenCalledTimes(1);
    const rawCall = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
    const sql = rawCall[0].join("?");
    expect(sql).toContain("PARTITION BY t.term_id");
    expect(sql).toContain("h.ord <= ?");
    expect(sql).not.toContain("plainto_tsquery");
    const params = rawCall.slice(1);
    expect(params).toContainEqual(["t1", "t2"]);
    expect(params).toContain(20);
    expect(params).toContain("statistics:*");
  });

  it("groups rows by term in the order of acadTermIds and keeps empty terms", async () => {
    queryRawMock.mockResolvedValue([
      row("AAA100", "t2"),
      row("BBB100", "t2"),
      row("CCC100", "t1"),
    ]);

    const result = await searchCoursesByTerms(mockDb, {
      query: "name",
      limitPerTerm: 20,
      acadTermIds: ["t3", "t1", "t2"],
    });

    expect(result.map((r) => r.acadTermId)).toEqual(["t3", "t1", "t2"]);
    expect(result[0]!.rows).toEqual([]);
    expect(result[1]!.rows.map((r) => r.code)).toEqual(["CCC100"]);
    expect(result[2]!.rows.map((r) => r.code)).toEqual(["AAA100", "BBB100"]);
  });

  it("applies the exact-code shortcut to each term on its own", async () => {
    queryRawMock.mockResolvedValue([
      row("MATH101", "t1"),
      row("MATH101A", "t1"),
      row("MATH101A", "t2"),
    ]);

    const result = await searchCoursesByTerms(mockDb, {
      query: "MATH101",
      limitPerTerm: 20,
      acadTermIds: ["t1", "t2"],
    });

    expect(result[0]!.rows.map((r) => r.code)).toEqual(["MATH101"]);
    expect(result[1]!.rows.map((r) => r.code)).toEqual(["MATH101A"]);
  });
});
