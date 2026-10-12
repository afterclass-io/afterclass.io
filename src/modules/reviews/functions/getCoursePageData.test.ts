import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCoursePageData } from "./getCoursePageData";

const mocks = vi.hoisted(() => ({
  getCourseByCode: vi.fn(),
  getMetadataForCourse: vi.fn(),
  countByCourseCode: vi.fn(),
}));

vi.mock("./getCourseByCode", () => ({
  getCourseByCode: mocks.getCourseByCode,
}));

vi.mock("@/common/tools/trpc/server", () => ({
  api: {
    reviews: { getMetadataForCourse: mocks.getMetadataForCourse },
    professors: { countByCourseCode: mocks.countByCourseCode },
  },
}));

describe("getCoursePageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null and skips the figure queries when the course is unknown", async () => {
    mocks.getCourseByCode.mockResolvedValue(null);

    await expect(getCoursePageData("XX999")).resolves.toBeNull();
    expect(mocks.getMetadataForCourse).not.toHaveBeenCalled();
    expect(mocks.countByCourseCode).not.toHaveBeenCalled();
  });

  it("returns the course with its review figures and professor count", async () => {
    const course = { name: "Digital Business", code: "IS215" };
    const reviewLabels = [{ name: "engaging", count: 3 }];
    mocks.getCourseByCode.mockResolvedValue(course);
    mocks.getMetadataForCourse.mockResolvedValue({
      averageRating: 4.11,
      reviewCount: 9,
      reviewLabels,
    });
    mocks.countByCourseCode.mockResolvedValue(6);

    await expect(getCoursePageData("IS215")).resolves.toEqual({
      course,
      averageRating: 4.11,
      reviewCount: 9,
      reviewLabels,
      professorCount: 6,
    });
    expect(mocks.getCourseByCode).toHaveBeenCalledWith("IS215");
    expect(mocks.getMetadataForCourse).toHaveBeenCalledWith({ code: "IS215" });
    expect(mocks.countByCourseCode).toHaveBeenCalledWith({
      courseCode: "IS215",
    });
  });
});
