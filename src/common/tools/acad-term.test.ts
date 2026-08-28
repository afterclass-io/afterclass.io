import { describe, it, expect, vi } from "vitest";
import {
  formatAcadTermLabel,
  toAcadTermSummary,
  resolveCurrentTerm,
  _fetchAcadTerms,
  listAcadTerms,
  getCurrentAcadTerm,
} from "./acad-term";
import type { AcadTermSummary } from "./acad-term";

// `unstable_cache` is a Next.js runtime primitive that cannot run inside
// vitest. Mock it as an identity wrapper so the exported functions execute
// their real logic (closure over the db client, no serialization of args).
vi.mock("next/cache", () => ({
  unstable_cache:
    <T extends (...args: never[]) => unknown>(fn: T) =>
    (...args: Parameters<T>) =>
      fn(...args),
}));

// Helper to create dates
const dt = (iso: string) => new Date(iso);

// ============================================================
// Test data: three terms spanning AY 2025/26 and 2026/27
// ============================================================
const sampleTerms: AcadTermSummary[] = [
  {
    id: "t1",
    label: "AY2025/26 T1",
    startDt: dt("2025-08-18"),
    endDt: dt("2025-12-06"),
  },
  {
    id: "t2",
    label: "AY2025/26 T2",
    startDt: dt("2026-01-12"),
    endDt: dt("2026-05-02"),
  },
  {
    id: "t3",
    label: "AY2026/27 T1",
    startDt: dt("2026-08-17"),
    endDt: dt("2026-12-05"),
  },
];

// ============================================================
// formatAcadTermLabel
// ============================================================
describe("formatAcadTermLabel", () => {
  it('(d) formats as "AY{acadYearStart}/{acadYearEnd} {term}"', () => {
    expect(formatAcadTermLabel(2025, 26, "T1")).toBe("AY2025/26 T1");
    expect(formatAcadTermLabel(2025, 26, "T2")).toBe("AY2025/26 T2");
    expect(formatAcadTermLabel(2024, 25, "ST1")).toBe("AY2024/25 ST1");
    expect(formatAcadTermLabel(2023, 2024, "T3")).toBe("AY2023/2024 T3");
  });
});

// ============================================================
// toAcadTermSummary
// ============================================================
describe("toAcadTermSummary", () => {
  it("maps a DB row to an AcadTermSummary with correct label", () => {
    const row = {
      id: "abc-123",
      acadYearStart: 2025,
      acadYearEnd: 26,
      term: "T1",
      startDt: dt("2025-08-18"),
      endDt: dt("2025-12-06"),
    };

    const result = toAcadTermSummary(row);

    expect(result).toEqual({
      id: "abc-123",
      label: "AY2025/26 T1",
      startDt: row.startDt,
      endDt: row.endDt,
    });
  });

  it("preserves original startDt and endDt references", () => {
    const start = dt("2025-08-18");
    const end = dt("2025-12-06");
    const row = {
      id: "x",
      acadYearStart: 2025,
      acadYearEnd: 26,
      term: "T1",
      startDt: start,
      endDt: end,
    };

    const result = toAcadTermSummary(row);

    expect(result.startDt).toBe(start);
    expect(result.endDt).toBe(end);
  });
});

// ============================================================
// resolveCurrentTerm
// ============================================================
describe("resolveCurrentTerm", () => {
  it("(a) returns the term whose [startDt, endDt] contains now", () => {
    // Oct 1, 2025 falls inside T1 (Aug 18 – Dec 6, 2025)
    const now = dt("2025-10-01");
    const result = resolveCurrentTerm(sampleTerms, now);
    expect(result?.id).toBe("t1");
  });

  it("(a) handles boundary: now exactly at startDt", () => {
    const now = dt("2025-08-18"); // exactly t1.startDt
    const result = resolveCurrentTerm(sampleTerms, now);
    expect(result?.id).toBe("t1");
  });

  it("(a) handles boundary: now exactly at endDt", () => {
    const now = dt("2025-12-06"); // exactly t1.endDt
    const result = resolveCurrentTerm(sampleTerms, now);
    expect(result?.id).toBe("t1");
  });

  it("(b) returns nearest upcoming term when now is between terms", () => {
    // Dec 20, 2025: after T1 (end Dec 6), before T2 (start Jan 12)
    const now = dt("2025-12-20");
    const result = resolveCurrentTerm(sampleTerms, now);
    expect(result?.id).toBe("t2");
  });

  it("(b) returns nearest upcoming when multiple future terms exist", () => {
    // May 10, 2026: after T2 (end May 2), before T3 (start Aug 17)
    const now = dt("2026-05-10");
    const result = resolveCurrentTerm(sampleTerms, now);
    expect(result?.id).toBe("t3");
  });

  it("returns latest past term when now is after all terms", () => {
    const now = dt("2027-06-01"); // after all terms
    const result = resolveCurrentTerm(sampleTerms, now);
    expect(result?.id).toBe("t3");
  });

  it("returns earliest upcoming term when now is before all terms", () => {
    const now = dt("2025-01-01"); // before all terms
    const result = resolveCurrentTerm(sampleTerms, now);
    expect(result?.id).toBe("t1");
  });

  it("(c) returns null for empty term list", () => {
    const result = resolveCurrentTerm([], dt("2025-10-01"));
    expect(result).toBeNull();
  });

  it("returns null when array is empty regardless of now", () => {
    const result = resolveCurrentTerm([], dt("2030-01-01"));
    expect(result).toBeNull();
  });

  it("handles single-term list: now inside", () => {
    const single = [sampleTerms[0]!];
    const result = resolveCurrentTerm(single, dt("2025-10-01"));
    expect(result?.id).toBe("t1");
  });

  it("handles single-term list: now before", () => {
    const single = [sampleTerms[0]!];
    const result = resolveCurrentTerm(single, dt("2025-01-01"));
    expect(result?.id).toBe("t1"); // only term, nearest upcoming
  });

  it("handles single-term list: now after", () => {
    const single = [sampleTerms[0]!];
    const result = resolveCurrentTerm(single, dt("2026-01-01"));
    expect(result?.id).toBe("t1"); // only term, latest past
  });
});

// ============================================================
// _fetchAcadTerms (uncached DB fetch)
// ============================================================
describe("_fetchAcadTerms", () => {
  it("(d) calls findMany with orderBy startDt desc and maps rows to summaries", async () => {
    const rows = [
      {
        id: "t2",
        acadYearStart: 2025,
        acadYearEnd: 26,
        term: "T2",
        startDt: dt("2026-01-12"),
        endDt: dt("2026-05-02"),
      },
      {
        id: "t1",
        acadYearStart: 2025,
        acadYearEnd: 26,
        term: "T1",
        startDt: dt("2025-08-18"),
        endDt: dt("2025-12-06"),
      },
    ];

    const findMany = vi.fn().mockResolvedValue(rows);
    const mockDb = { acadTerm: { findMany } };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    const result = await _fetchAcadTerms(mockDb);

    // Verify the correct query was issued
    expect(findMany).toHaveBeenCalledWith({
      orderBy: { startDt: "desc" },
    });

    // Verify label format on each summary
    expect(result).toHaveLength(2);
    expect(result[0]!.label).toBe("AY2025/26 T2");
    expect(result[0]!.id).toBe("t2");
    expect(result[1]!.label).toBe("AY2025/26 T1");
    expect(result[1]!.id).toBe("t1");
  });

  it("returns empty array when no rows exist", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const mockDb = { acadTerm: { findMany } };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    const result = await _fetchAcadTerms(mockDb);

    expect(result).toEqual([]);
  });
});

// ============================================================
// listAcadTerms / getCurrentAcadTerm (cached public API)
// ============================================================

/**
 * Build a mock db shaped like a real PrismaClient — including a circular
 * reference, which makes it impossible to `JSON.stringify`. Regression
 * guard: the cached API must never put the client into a cache key
 * (previously every call threw "Converting circular structure to JSON").
 */
function buildCircularMockDb(rows: unknown[]) {
  const findMany = vi.fn().mockResolvedValue(rows);
  const mockDb = {
    acadTerm: { findMany },
    _engine: undefined,
  } as {
    acadTerm: { findMany: typeof findMany };
    _engine?: unknown;
  };
  mockDb._engine = { client: mockDb }; // circular, like a real PrismaClient
  expect(() => JSON.stringify(mockDb)).toThrow(); // sanity: not serializable
  return { mockDb, findMany };
}

const sampleRows = [
  {
    id: "t2",
    acadYearStart: 2025,
    acadYearEnd: 26,
    term: "T2",
    startDt: dt("2026-01-12"),
    endDt: dt("2026-05-02"),
  },
  {
    id: "t1",
    acadYearStart: 2025,
    acadYearEnd: 26,
    term: "T1",
    startDt: dt("2025-08-18"),
    endDt: dt("2025-12-06"),
  },
];

describe("listAcadTerms", () => {
  it("works with a circular (real-shaped) Prisma client without serializing it", async () => {
    const { mockDb, findMany } = buildCircularMockDb(sampleRows);

    const result = await listAcadTerms(mockDb);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { startDt: "desc" },
    });
    expect(result).toHaveLength(2);
    expect(result[0]!.label).toBe("AY2025/26 T2");
    expect(result[1]!.label).toBe("AY2025/26 T1");
  });
});

describe("getCurrentAcadTerm", () => {
  it("resolves the current term from the fetched list", async () => {
    const { mockDb } = buildCircularMockDb(sampleRows);

    const result = await getCurrentAcadTerm(mockDb, dt("2026-02-01"));

    expect(result?.id).toBe("t2");
    expect(result?.label).toBe("AY2025/26 T2");
  });

  it("defaults `now` to the current date and returns null for empty list", async () => {
    const { mockDb } = buildCircularMockDb([]);

    const result = await getCurrentAcadTerm(mockDb);

    expect(result).toBeNull();
  });
});
