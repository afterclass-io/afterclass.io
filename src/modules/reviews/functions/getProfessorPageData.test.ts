import { beforeEach, describe, expect, it, vi } from "vitest";

import { getProfessorPageData } from "./getProfessorPageData";

const mocks = vi.hoisted(() => ({
  getProfessorBySlug: vi.fn(),
  getMetadataForProf: vi.fn(),
  countByProfSlug: vi.fn(),
}));

vi.mock("./getProfessorBySlug", () => ({
  getProfessorBySlug: mocks.getProfessorBySlug,
}));

vi.mock("@/common/tools/trpc/server", () => ({
  api: {
    reviews: { getMetadataForProf: mocks.getMetadataForProf },
    courses: { countByProfSlug: mocks.countByProfSlug },
  },
}));

describe("getProfessorPageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null and skips the figure queries when the professor is unknown", async () => {
    mocks.getProfessorBySlug.mockResolvedValue(null);

    await expect(getProfessorPageData("nobody")).resolves.toBeNull();
    expect(mocks.getMetadataForProf).not.toHaveBeenCalled();
    expect(mocks.countByProfSlug).not.toHaveBeenCalled();
  });

  it("returns the professor with its review figures and course count", async () => {
    const professor = { name: "OUH Eng Lieh", slug: "ouh-eng-lieh" };
    const reviewLabels = [{ name: "engaging", count: 8 }];
    mocks.getProfessorBySlug.mockResolvedValue(professor);
    mocks.getMetadataForProf.mockResolvedValue({
      averageRating: 4.25,
      reviewCount: 20,
      reviewLabels,
    });
    mocks.countByProfSlug.mockResolvedValue(2);

    await expect(getProfessorPageData("ouh-eng-lieh")).resolves.toEqual({
      professor,
      averageRating: 4.25,
      reviewCount: 20,
      reviewLabels,
      courseCount: 2,
    });
    expect(mocks.getProfessorBySlug).toHaveBeenCalledWith("ouh-eng-lieh");
    expect(mocks.getMetadataForProf).toHaveBeenCalledWith({
      slug: "ouh-eng-lieh",
    });
    expect(mocks.countByProfSlug).toHaveBeenCalledWith({
      slug: "ouh-eng-lieh",
    });
  });
});
