import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  canViewData: vi.fn<(session: unknown, ...domains: string[]) => boolean>(),
  searchCourses: vi.fn(),
  searchProfessors: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ auth: m.auth }));
vi.mock("@/server/ecfg/public-data", () => ({
  canViewData: async (session: unknown, ...domains: string[]) =>
    m.canViewData(session, ...domains),
}));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/search/search-service", () => ({
  DEFAULT_UNIVERSITY_ABBRV: "SMU",
  searchCourses: m.searchCourses,
  searchProfessors: m.searchProfessors,
}));
vi.mock("@/common/components/auth-wall", () => ({
  AuthWall: ({ feature }: { feature: string }) => (
    <div data-stub="wall">{feature}</div>
  ),
}));
vi.mock("@/modules/search/components/SearchResult", () => ({
  SearchResult: Object.assign(
    ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    {
      Title: () => null,
      Content: (props: {
        searchedCourse: unknown[];
        searchedProf: unknown[];
      }) => (
        <div
          data-stub="content"
          data-courses={props.searchedCourse.length}
          data-profs={props.searchedProf.length}
        />
      ),
    },
  ),
}));

import Search from "./page";

const searchProps = { searchParams: Promise.resolve({ q: "intro" }) };

describe("Search page gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.auth.mockResolvedValue(null);
    m.searchCourses.mockResolvedValue({
      rows: [
        {
          code: "IS215",
          name: "Analytics",
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
          slug: "john-doe",
          name: "John Doe",
          uniAbbrv: "SMU",
          courseCount: 0,
          reviewCount: 0,
        },
      ],
      total: 1,
    });
  });

  it("shows the wall and runs no query when both types are private", async () => {
    m.canViewData.mockReturnValue(false);
    const html = renderToStaticMarkup(await Search(searchProps));
    expect(html).toContain('data-stub="wall"');
    expect(m.searchCourses).not.toHaveBeenCalled();
    expect(m.searchProfessors).not.toHaveBeenCalled();
  });

  it("omits professors when only courses are public", async () => {
    m.canViewData.mockImplementation((_s, ...domains) =>
      domains.every((d) => d === "courses"),
    );
    const html = renderToStaticMarkup(await Search(searchProps));
    expect(m.searchProfessors).not.toHaveBeenCalled();
    expect(html).toContain('data-courses="1"');
    expect(html).toContain('data-profs="0"');
  });

  it("omits courses when only professors are public", async () => {
    m.canViewData.mockImplementation((_s, ...domains) =>
      domains.every((d) => d === "professors"),
    );
    const html = renderToStaticMarkup(await Search(searchProps));
    expect(m.searchCourses).not.toHaveBeenCalled();
    expect(html).toContain('data-courses="0"');
    expect(html).toContain('data-profs="1"');
  });

  it("returns both types when both are public", async () => {
    m.canViewData.mockReturnValue(true);
    const html = renderToStaticMarkup(await Search(searchProps));
    expect(html).toContain('data-courses="1"');
    expect(html).toContain('data-profs="1"');
  });
});
