import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetByCourseCode = vi.fn();
const mockGetMetadataForCourse = vi.fn();
const mockGetBySlug = vi.fn();
const mockGetMetadataForProf = vi.fn();
const mockGetRoadmapById = vi.fn();

/* eslint-disable @typescript-eslint/no-unsafe-return */
vi.mock("@/common/tools/trpc/server", () => ({
  api: {
    courses: {
      getByCourseCode: (...args: unknown[]) => mockGetByCourseCode(...args),
    },
    reviews: {
      getMetadataForCourse: (...args: unknown[]) =>
        mockGetMetadataForCourse(...args),
      getMetadataForProf: (...args: unknown[]) =>
        mockGetMetadataForProf(...args),
    },
    professors: {
      getBySlug: (...args: unknown[]) => mockGetBySlug(...args),
    },
    roadmaps: {
      getById: (...args: unknown[]) => mockGetRoadmapById(...args),
    },
  },
}));
/* eslint-enable @typescript-eslint/no-unsafe-return */

vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: "https://afterclass.io",
  },
}));

import { generateMetadata as generateCourseMetadata } from "./(reviews)/@reviews/course/[code]/page";
import { generateMetadata as generateProfMetadata } from "./(reviews)/@reviews/professor/[slug]/page";
import { generateMetadata as generateRoadmapMetadata } from "./roadmaps/[id]/page";

describe("Canonical metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Course route metadata", () => {
    it("declares alternates.canonical as /course/[code] in uppercase", async () => {
      mockGetByCourseCode.mockResolvedValue({
        code: "IS215",
        name: "Digital Business - Technologies and Transformation",
      });
      mockGetMetadataForCourse.mockResolvedValue({
        reviewCount: 9,
        averageRating: 4.11,
      });

      const metadata = await generateCourseMetadata({
        params: Promise.resolve({ code: "is215" }),
      });

      expect(metadata.alternates).toEqual({
        canonical: "/course/IS215",
      });
      expect(metadata.title).toBe(
        "IS215: Digital Business - Technologies and Transformation",
      );
    });

    it("does not include canonical when course is not found", async () => {
      mockGetByCourseCode.mockResolvedValue(null);

      const metadata = await generateCourseMetadata({
        params: Promise.resolve({ code: "DOESNOTEXIST" }),
      });

      expect(metadata.title).toBe("Course Not Found");
      expect(metadata.alternates).toBeUndefined();
    });

    it("handles errors gracefully and returns Course Not Found without canonical", async () => {
      mockGetByCourseCode.mockRejectedValue(new Error("Network failure"));

      const metadata = await generateCourseMetadata({
        params: Promise.resolve({ code: "IS215" }),
      });

      expect(metadata.title).toBe("Course Not Found");
      expect(metadata.alternates).toBeUndefined();
    });
  });

  describe("Professor route metadata", () => {
    it("declares alternates.canonical as /professor/[slug]", async () => {
      mockGetBySlug.mockResolvedValue({
        id: "prof-1",
        slug: "ouh-eng-lieh",
        name: "Ouh Eng Lieh",
      });
      mockGetMetadataForProf.mockResolvedValue({
        reviewCount: 20,
        averageRating: 4.25,
      });

      const metadata = await generateProfMetadata({
        params: Promise.resolve({ slug: "ouh-eng-lieh" }),
      });

      expect(metadata.alternates).toEqual({
        canonical: "/professor/ouh-eng-lieh",
      });
      expect(metadata.title).toBe("Ouh Eng Lieh");
    });

    it("does not include canonical when professor is not found", async () => {
      mockGetBySlug.mockResolvedValue(null);

      const metadata = await generateProfMetadata({
        params: Promise.resolve({ slug: "does-not-exist" }),
      });

      expect(metadata.title).toBe("Professor Not Found");
      expect(metadata.alternates).toBeUndefined();
    });

    it("handles errors gracefully and returns Professor Not Found without canonical", async () => {
      mockGetBySlug.mockRejectedValue(new Error("Network failure"));

      const metadata = await generateProfMetadata({
        params: Promise.resolve({ slug: "ouh-eng-lieh" }),
      });

      expect(metadata.title).toBe("Professor Not Found");
      expect(metadata.alternates).toBeUndefined();
    });
  });

  describe("Roadmap detail route metadata", () => {
    it("declares alternates.canonical as /roadmaps/[id]", async () => {
      mockGetRoadmapById.mockResolvedValue({
        roadmap: {
          id: "roadmap-002-user-a",
          name: "BSc Information Systems (Community)",
        },
        ownerUsername: "studentA",
        entries: [{ id: "entry-1" }, { id: "entry-2" }],
      });

      const metadata = await generateRoadmapMetadata({
        params: Promise.resolve({ id: "roadmap-002-user-a" }),
      });

      expect(metadata.alternates).toEqual({
        canonical: "/roadmaps/roadmap-002-user-a",
      });
      expect(metadata.title).toBe(
        "BSc Information Systems (Community) — Roadmap by studentA",
      );
      expect(metadata.description).toBe(
        "A public degree roadmap by studentA with 2 courses.",
      );
    });

    it("handles errors gracefully and returns Roadmap Not Found without canonical", async () => {
      mockGetRoadmapById.mockRejectedValue(new Error("Not found"));

      const metadata = await generateRoadmapMetadata({
        params: Promise.resolve({ id: "invalid-id" }),
      });

      expect(metadata.title).toBe("Roadmap Not Found");
      expect(metadata.alternates).toBeUndefined();
    });
  });
});
