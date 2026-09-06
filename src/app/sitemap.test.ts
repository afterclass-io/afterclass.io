import { describe, expect, it, vi, beforeEach } from "vitest";

import sitemap, { revalidate } from "./sitemap";

vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: "https://afterclass.io",
  },
}));

const mockGetAllCourses = vi.fn();
const mockGetAllProfessors = vi.fn();
const mockListPublicRoadmaps = vi.fn();

/* eslint-disable @typescript-eslint/no-unsafe-return */
vi.mock("@/common/tools/trpc/server", () => ({
  api: {
    courses: {
      getAllByUniAbbrv: (...args: unknown[]) => mockGetAllCourses(...args),
    },
    professors: {
      getAllByUniAbbrv: (...args: unknown[]) => mockGetAllProfessors(...args),
    },
    roadmaps: {
      listPublic: (...args: unknown[]) => mockListPublicRoadmaps(...args),
    },
  },
}));
/* eslint-enable @typescript-eslint/no-unsafe-return */

describe("sitemap()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports revalidate of 86400 seconds (24h)", () => {
    expect(revalidate).toBe(86400);
  });

  it("enumerates static routes, courses, professors, and paginated roadmaps", async () => {
    mockGetAllCourses.mockResolvedValue([
      { id: "c1", code: "IS215", name: "Digital Business" },
      { id: "c2", code: "MGMT214", name: "Management" },
    ]);

    mockGetAllProfessors.mockResolvedValue([
      { id: "p1", slug: "yixin-cao", name: "Yixin CAO" },
      { id: "p2", slug: "cheng-shih-fen", name: "CHENG Shih-Fen" },
    ]);

    // Page 1 returns 2 items with nextCursor
    mockListPublicRoadmaps.mockResolvedValueOnce({
      items: [
        { roadmap: { id: "roadmap-1" } },
        { roadmap: { id: "roadmap-2" } },
      ],
      nextCursor: "cursor-page-2",
    });

    // Page 2 returns 1 item without nextCursor
    mockListPublicRoadmaps.mockResolvedValueOnce({
      items: [{ roadmap: { id: "roadmap-3" } }],
      nextCursor: null,
    });

    const result = await sitemap();

    expect(mockGetAllCourses).toHaveBeenCalledWith({ universityAbbrv: "SMU" });
    expect(mockGetAllProfessors).toHaveBeenCalledWith({ universityAbbrv: "SMU" });
    expect(mockListPublicRoadmaps).toHaveBeenNthCalledWith(1, {
      limit: 50,
      cursor: undefined,
    });
    expect(mockListPublicRoadmaps).toHaveBeenNthCalledWith(2, {
      limit: 50,
      cursor: "cursor-page-2",
    });

    expect(result).toEqual([
      // Static routes
      { url: "https://afterclass.io/" },
      { url: "https://afterclass.io/roadmaps" },
      { url: "https://afterclass.io/bidding" },
      { url: "https://afterclass.io/bidding/analytics" },
      // Courses
      { url: "https://afterclass.io/course/IS215" },
      { url: "https://afterclass.io/course/MGMT214" },
      // Professors
      { url: "https://afterclass.io/professor/yixin-cao" },
      { url: "https://afterclass.io/professor/cheng-shih-fen" },
      // Roadmaps
      { url: "https://afterclass.io/roadmaps/roadmap-1" },
      { url: "https://afterclass.io/roadmaps/roadmap-2" },
      { url: "https://afterclass.io/roadmaps/roadmap-3" },
    ]);
  });

  it("handles empty catalogue and roadmaps gracefully", async () => {
    mockGetAllCourses.mockResolvedValue([]);
    mockGetAllProfessors.mockResolvedValue([]);
    mockListPublicRoadmaps.mockResolvedValue({
      items: [],
      nextCursor: null,
    });

    const result = await sitemap();

    expect(result).toEqual([
      { url: "https://afterclass.io/" },
      { url: "https://afterclass.io/roadmaps" },
      { url: "https://afterclass.io/bidding" },
      { url: "https://afterclass.io/bidding/analytics" },
    ]);
  });

  it("terminates when cursor repeats in cycle", async () => {
    mockGetAllCourses.mockResolvedValue([]);
    mockGetAllProfessors.mockResolvedValue([]);
    mockListPublicRoadmaps.mockResolvedValue({
      items: [{ roadmap: { id: "roadmap-cycle" } }],
      nextCursor: "same-cursor",
    });

    const result = await sitemap();

    expect(mockListPublicRoadmaps).toHaveBeenCalledTimes(2);
    expect(result).toContainEqual({
      url: "https://afterclass.io/roadmaps/roadmap-cycle",
    });
  });
});
