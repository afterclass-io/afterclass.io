import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps, ReactElement } from "react";
import type { SearchResultContent } from "@/modules/search/components/SearchResult/SearchResultContent/SearchResultContent";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  searchCourseResults: vi.fn(),
  searchProfessorResults: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ auth: m.auth }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/search/search-service", () => ({
  searchCourseResults: m.searchCourseResults,
  searchProfessorResults: m.searchProfessorResults,
}));

import Search from "./page";

type PageTree = ReactElement<{
  children: ReactElement<{
    children: [
      unknown,
      ReactElement<ComponentProps<typeof SearchResultContent>>,
    ];
  }>;
}>;

describe("Search page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call search services when query is empty", async () => {
    const jsx = await Search({ searchParams: Promise.resolve({ q: "" }) });
    expect(m.auth).not.toHaveBeenCalled();
    expect(m.searchCourseResults).not.toHaveBeenCalled();
    expect(m.searchProfessorResults).not.toHaveBeenCalled();
    expect(jsx).toBeDefined();
  });

  it("seeds 20 keyword results with withCounts: false when signed out", async () => {
    m.auth.mockResolvedValue(null);
    m.searchCourseResults.mockResolvedValue({
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
      totals: { matches: 1, related: 0 },
      nextCursor: null,
    });
    m.searchProfessorResults.mockResolvedValue({
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
      totals: { matches: 1, related: 0 },
      nextCursor: null,
    });

    const jsx = await Search({ searchParams: Promise.resolve({ q: "IS215" }) });

    expect(m.auth).toHaveBeenCalledTimes(1);
    expect(m.searchCourseResults).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        query: "IS215",
        limit: 20,
        withCounts: false,
        group: "matches",
      }),
    );
    expect(m.searchProfessorResults).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        query: "IS215",
        limit: 20,
        withCounts: false,
        group: "matches",
      }),
    );
    const content = (jsx as PageTree).props.children.props.children[1];
    expect(content.props.initialCourses).toEqual(
      await m.searchCourseResults.mock.results[0]!.value,
    );
    expect(content.props.initialProfessors).toEqual(
      await m.searchProfessorResults.mock.results[0]!.value,
    );
  });

  it("calls search services with withCounts: true when signed in", async () => {
    m.auth.mockResolvedValue({ user: { id: "u1" } });
    m.searchCourseResults.mockResolvedValue({
      rows: [],
      totals: { matches: 0, related: 0 },
      nextCursor: null,
    });
    m.searchProfessorResults.mockResolvedValue({
      rows: [],
      totals: { matches: 0, related: 0 },
      nextCursor: null,
    });

    await Search({ searchParams: Promise.resolve({ q: "CS101" }) });

    expect(m.searchCourseResults).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        query: "CS101",
        limit: 20,
        withCounts: true,
        group: "matches",
      }),
    );
    expect(m.searchProfessorResults).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        query: "CS101",
        limit: 20,
        withCounts: true,
        group: "matches",
      }),
    );
  });

  it("caps the SSR query so pagination accepts the same search", async () => {
    m.auth.mockResolvedValue(null);
    const empty = {
      rows: [],
      totals: { matches: 0, related: 0 },
      nextCursor: null,
    };
    m.searchCourseResults.mockResolvedValue(empty);
    m.searchProfessorResults.mockResolvedValue(empty);
    const query = "Singapore" + " ".repeat(191) + "x";
    const jsx = await Search({ searchParams: Promise.resolve({ q: query }) });
    expect(m.searchCourseResults).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ query: query.slice(0, 200) }),
    );
    const content = (jsx as PageTree).props.children.props.children[1];
    expect(content.props.query).toBe(query.slice(0, 200));
  });

  it("renders the short-query state, not no results, for a one-character query", async () => {
    m.auth.mockResolvedValue(null);
    m.searchCourseResults.mockResolvedValue({
      rows: [],
      totals: { matches: 0, related: 0 },
      nextCursor: null,
    });
    m.searchProfessorResults.mockResolvedValue({
      rows: [],
      totals: { matches: 0, related: 0 },
      nextCursor: null,
    });

    const jsx = await Search({ searchParams: Promise.resolve({ q: "i" }) });
    const html = renderToStaticMarkup(jsx);

    expect(html).toContain("Type 2 or more characters.");
    expect(html).not.toContain("No results");
  });
});
