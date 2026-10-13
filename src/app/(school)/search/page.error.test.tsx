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

// A failed search must reach the (school) error boundary and Sentry's
// onRequestError hook. Rendering "No results found" would tell the user
// the course does not exist when the database is down.
describe("Search page failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.auth.mockResolvedValue(null);
  });

  it("lets a search service error reach the error boundary", async () => {
    const failure = new Error("connection refused");
    m.searchCourseResults.mockRejectedValue(failure);
    m.searchProfessorResults.mockResolvedValue({
      rows: [],
      totals: { matches: 0, related: 0 },
      nextCursor: null,
    });

    await expect(
      Search({ searchParams: Promise.resolve({ q: "IS215" }) }),
    ).rejects.toBe(failure);
  });

  it("lets an auth lookup error reach the error boundary", async () => {
    const failure = new Error("auth down");
    m.auth.mockRejectedValue(failure);

    await expect(
      Search({ searchParams: Promise.resolve({ q: "IS215" }) }),
    ).rejects.toBe(failure);
  });
});
