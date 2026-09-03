import { beforeEach, describe, expect, it, vi } from "vitest";
import { processSearchQuery } from "./processSearchQuery";
import { searchCourse } from "./searchCourse";
import { searchProf } from "./searchProf";

// searchCourse/searchProf pull the module-scope `db`, `auth`, and the RSC `api`
// caller (which starts with `import "server-only"`). Factory-form mocks so the
// real modules never evaluate; the fns are hoisted so the factories can close
// over them.
const m = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  auth: vi.fn(),
  countByCourseCode: vi.fn(),
  countByProfSlug: vi.fn(),
  reviewsCount: vi.fn(),
}));

vi.mock("@/server/db", () => ({ db: { $queryRaw: m.queryRaw } }));
vi.mock("@/server/auth", () => ({ auth: m.auth }));
vi.mock("@/common/tools/trpc/server", () => ({
  api: {
    professors: { countByCourseCode: m.countByCourseCode },
    courses: { countByProfSlug: m.countByProfSlug },
    reviews: { count: m.reviewsCount },
  },
}));

/** The interpolated value handed to `to_tsquery` — the 2nd arg of the tagged template. */
const tsQueryArg = () => (m.queryRaw.mock.calls[0] as unknown[])[1];
/** The `LIMIT` value — the 3rd arg of the tagged template. */
const limitArg = () => (m.queryRaw.mock.calls[0] as unknown[])[2];

beforeEach(() => vi.clearAllMocks());

describe("processSearchQuery", () => {
  it("returns a single-word query untouched", () => {
    expect(processSearchQuery("computing")).toBe("computing");
  });

  it("trims surrounding whitespace", () => {
    expect(processSearchQuery("  computing  ")).toBe("computing");
  });

  it("joins multi-word queries with the tsquery AND operator", () => {
    expect(processSearchQuery("intro to computing")).toBe(
      "intro & to & computing",
    );
  });

  it("returns an empty string for an empty query", () => {
    expect(processSearchQuery("")).toBe("");
  });

  it("normalises repeated whitespace to a single AND operator", () => {
    expect(processSearchQuery("a  b")).toBe("a & b");
  });
});

describe("searchCourse", () => {
  const rows = [
    { uniAbbrv: "SMU", courseCode: "IS111", courseName: "Python" },
    { uniAbbrv: "SMU", courseCode: "CS102", courseName: "Data Structures" },
  ];

  it("appends the prefix-match suffix to the processed query and passes the limit", async () => {
    m.queryRaw.mockResolvedValue([]);
    m.auth.mockResolvedValue(null);

    await searchCourse("intro to computing");

    expect(tsQueryArg()).toBe("intro & to & computing:*");
    expect(limitArg()).toBe(5);
  });

  it("honours a caller-supplied limit", async () => {
    m.queryRaw.mockResolvedValue([]);
    m.auth.mockResolvedValue(null);

    await searchCourse("python", 20);

    expect(limitArg()).toBe(20);
  });

  it("returns zeroed counts and skips the per-row lookups when unauthenticated", async () => {
    m.queryRaw.mockResolvedValue(rows);
    m.auth.mockResolvedValue(null);

    const result = await searchCourse("python");

    expect(result).toEqual([
      { ...rows[0], profCount: 0, reviewCount: 0 },
      { ...rows[1], profCount: 0, reviewCount: 0 },
    ]);
    expect(m.countByCourseCode).not.toHaveBeenCalled();
    expect(m.reviewsCount).not.toHaveBeenCalled();
  });

  it("returns prof and review counts from the primary aggregate query when authenticated", async () => {
    m.queryRaw.mockResolvedValue([
      { ...rows[0], profCount: 3, reviewCount: 7 },
      { ...rows[1], profCount: 1, reviewCount: 2 },
    ]);
    m.auth.mockResolvedValue({ user: { id: "u1" } });

    const result = await searchCourse("python");

    expect(result).toEqual([
      { ...rows[0], profCount: 3, reviewCount: 7 },
      { ...rows[1], profCount: 1, reviewCount: 2 },
    ]);
    // counts come from the single raw query — the per-row lookups are gone
    expect(m.queryRaw).toHaveBeenCalledTimes(1);
    expect(m.countByCourseCode).not.toHaveBeenCalled();
    expect(m.reviewsCount).not.toHaveBeenCalled();
  });

  it("folds distinct counts into the primary query with LEFT JOINs and GROUP BY", async () => {
    m.queryRaw.mockResolvedValue([]);
    m.auth.mockResolvedValue({ user: { id: "u1" } });

    await searchCourse("python");

    const sql = ((m.queryRaw.mock.calls[0] as unknown[])[0] as string[]).join(
      " ",
    );
    expect(sql).toContain("COUNT(DISTINCT");
    expect(sql).toContain("LEFT JOIN");
    expect(sql).toContain("GROUP BY");
  });
});

describe("searchProf", () => {
  const rows = [
    { uniAbbrv: "SMU", profName: "Ada Lovelace", profSlug: "ada-lovelace" },
    { uniAbbrv: "SMU", profName: "Alan Turing", profSlug: "alan-turing" },
  ];

  it("appends the prefix-match suffix to the processed query and passes the limit", async () => {
    m.queryRaw.mockResolvedValue([]);
    m.auth.mockResolvedValue(null);

    await searchProf("ada lovelace", 3);

    expect(tsQueryArg()).toBe("ada & lovelace:*");
    expect(limitArg()).toBe(3);
  });

  it("returns zeroed counts and skips the per-row lookups when unauthenticated", async () => {
    m.queryRaw.mockResolvedValue(rows);
    m.auth.mockResolvedValue(null);

    const result = await searchProf("a");

    expect(result).toEqual([
      { ...rows[0], courseCount: 0, reviewCount: 0 },
      { ...rows[1], courseCount: 0, reviewCount: 0 },
    ]);
    expect(m.countByProfSlug).not.toHaveBeenCalled();
  });

  it("returns course and review counts from the primary aggregate query when authenticated", async () => {
    m.queryRaw.mockResolvedValue([
      { ...rows[0], courseCount: 4, reviewCount: 9 },
      { ...rows[1], courseCount: 2, reviewCount: 5 },
    ]);
    m.auth.mockResolvedValue({ user: { id: "u1" } });

    const result = await searchProf("ada");

    expect(result).toEqual([
      { ...rows[0], courseCount: 4, reviewCount: 9 },
      { ...rows[1], courseCount: 2, reviewCount: 5 },
    ]);
    // counts come from the single raw query — the per-row lookups are gone
    expect(m.queryRaw).toHaveBeenCalledTimes(1);
    expect(m.countByProfSlug).not.toHaveBeenCalled();
    expect(m.reviewsCount).not.toHaveBeenCalled();
  });

  it("folds distinct counts into the primary query with LEFT JOINs and GROUP BY", async () => {
    m.queryRaw.mockResolvedValue([]);
    m.auth.mockResolvedValue({ user: { id: "u1" } });

    await searchProf("ada");

    const sql = ((m.queryRaw.mock.calls[0] as unknown[])[0] as string[]).join(
      " ",
    );
    expect(sql).toContain("COUNT(DISTINCT");
    expect(sql).toContain("LEFT JOIN");
    expect(sql).toContain("GROUP BY");
  });
});
