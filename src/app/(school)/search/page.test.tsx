import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  searchCourses: vi.fn(),
  searchProfessors: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ auth: m.auth }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/search/search-service", () => ({
  DEFAULT_UNIVERSITY_ABBRV: "SMU",
  searchCourses: m.searchCourses,
  searchProfessors: m.searchProfessors,
}));

import Search from "./page";

describe("Search page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call search services when query is empty", async () => {
    const jsx = await Search({ searchParams: Promise.resolve({ q: "" }) });
    expect(m.auth).not.toHaveBeenCalled();
    expect(m.searchCourses).not.toHaveBeenCalled();
    expect(m.searchProfessors).not.toHaveBeenCalled();
    expect(jsx).toBeDefined();
  });

  it("calls search services with withCounts: false and DEFAULT_UNIVERSITY_ABBRV when signed out", async () => {
    m.auth.mockResolvedValue(null);
    m.searchCourses.mockResolvedValue({
      rows: [
        {
          id: "1",
          code: "IS215",
          name: "Analytics",
          creditUnits: 1,
          uniAbbrv: "SMU",
          profCount: 0,
          reviewCount: 0,
        },
      ],
      total: 1,
    });
    m.searchProfessors.mockResolvedValue({
      rows: [
        {
          id: "2",
          slug: "john-doe",
          name: "John Doe",
          uniAbbrv: "SMU",
          courseCount: 0,
          reviewCount: 0,
        },
      ],
      total: 1,
    });

    const jsx = await Search({ searchParams: Promise.resolve({ q: "IS215" }) });

    expect(m.auth).toHaveBeenCalledTimes(1);
    expect(m.searchCourses).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        query: "IS215",
        limit: 5,
        withCounts: false,
        universityAbbrv: "SMU",
      }),
    );
    expect(m.searchProfessors).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        query: "IS215",
        limit: 5,
        withCounts: false,
        universityAbbrv: "SMU",
      }),
    );
    expect(jsx).toBeDefined();
  });

  it("calls search services with withCounts: true when signed in", async () => {
    m.auth.mockResolvedValue({ user: { id: "u1" } });
    m.searchCourses.mockResolvedValue({ rows: [], total: 0 });
    m.searchProfessors.mockResolvedValue({ rows: [], total: 0 });

    await Search({ searchParams: Promise.resolve({ q: "CS101" }) });

    expect(m.searchCourses).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        query: "CS101",
        limit: 5,
        withCounts: true,
        universityAbbrv: "SMU",
      }),
    );
    expect(m.searchProfessors).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        query: "CS101",
        limit: 5,
        withCounts: true,
        universityAbbrv: "SMU",
      }),
    );
  });

  it("renders the short-query state, not no results, for a one-character query", async () => {
    m.auth.mockResolvedValue(null);
    m.searchCourses.mockResolvedValue({ rows: [], total: 0 });
    m.searchProfessors.mockResolvedValue({ rows: [], total: 0 });

    const jsx = await Search({ searchParams: Promise.resolve({ q: "i" }) });
    const html = renderToStaticMarkup(jsx);

    expect(html).toContain("Type 2 or more characters.");
    expect(html).not.toContain("No results");
  });
});
