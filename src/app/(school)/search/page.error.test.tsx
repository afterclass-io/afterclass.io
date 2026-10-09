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
    m.searchCourses.mockRejectedValue(failure);
    m.searchProfessors.mockResolvedValue({ rows: [], total: 0 });

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
