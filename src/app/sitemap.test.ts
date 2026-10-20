import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  isDataPublic: vi.fn<(...domains: string[]) => boolean>(),
  getAllCourses: vi.fn(),
  getAllProfessors: vi.fn(),
  listPublic: vi.fn(),
}));

vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_SITE_URL: "https://x.test" } }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/ecfg/public-data", () => ({
  isDataPublic: async (...domains: string[]) => m.isDataPublic(...domains),
}));
vi.mock("@/server/api/root", () => ({
  createCaller: () => ({
    courses: { getAllByUniAbbrv: m.getAllCourses },
    professors: { getAllByUniAbbrv: m.getAllProfessors },
    roadmaps: { listPublic: m.listPublic },
  }),
}));

import sitemap from "./sitemap";

const urls = async () => (await sitemap()).map((entry) => entry.url);

function publicDomains(...allowed: string[]) {
  m.isDataPublic.mockImplementation((...domains) =>
    domains.every((d) => allowed.includes(d)),
  );
}

describe("sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.getAllCourses.mockResolvedValue([{ code: "IS215" }]);
    m.getAllProfessors.mockResolvedValue([{ slug: "john-doe" }]);
    m.listPublic.mockResolvedValue({
      items: [{ roadmap: { id: "r1" } }],
      nextCursor: null,
    });
  });

  it("lists only static pages and calls no gated endpoint when every domain is private", async () => {
    publicDomains();
    const result = await urls();
    expect(result).toEqual([
      "https://x.test/",
      "https://x.test/privacy",
      "https://x.test/terms",
    ]);
    expect(m.getAllCourses).not.toHaveBeenCalled();
    expect(m.getAllProfessors).not.toHaveBeenCalled();
    expect(m.listPublic).not.toHaveBeenCalled();
  });

  it("lists course and professor URLs by their own domain, whatever reviews say", async () => {
    publicDomains("courses");
    let result = await urls();
    expect(result).toContain("https://x.test/course/IS215");
    expect(result).not.toContain("https://x.test/professor/john-doe");
    expect(m.getAllProfessors).not.toHaveBeenCalled();

    publicDomains("professors");
    result = await urls();
    expect(result).not.toContain("https://x.test/course/IS215");
    expect(result).toContain("https://x.test/professor/john-doe");
  });

  it("lists each domain's URLs when it is public", async () => {
    publicDomains("courses", "professors", "reviews", "publicRoadmaps");
    const result = await urls();
    expect(result).toContain("https://x.test/course/IS215");
    expect(result).toContain("https://x.test/professor/john-doe");
    expect(result).toContain("https://x.test/roadmaps/r1");
    expect(result).toContain("https://x.test/roadmaps");
    expect(result).not.toContain("https://x.test/bidding");
  });

  it("lists the bidding page only when class data is public", async () => {
    publicDomains("classData");
    expect(await urls()).toContain("https://x.test/bidding");
  });
});
