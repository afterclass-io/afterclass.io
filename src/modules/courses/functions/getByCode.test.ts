import { beforeEach, describe, expect, it, vi } from "vitest";

// getByCode pulls the RSC `api` caller (which starts with `import "server-only"`).
// Factory-form mock so the real module never evaluates.
const m = vi.hoisted(() => ({
  getByCourseCode: vi.fn(),
  getBySlug: vi.fn(),
}));

vi.mock("@/common/tools/trpc/server", () => ({
  api: {
    courses: { getByCourseCode: m.getByCourseCode },
    professors: { getBySlug: m.getBySlug },
  },
}));

import { getCourseByCode, getProfessorBySlug } from "./getByCode";

beforeEach(() => vi.clearAllMocks());

describe("getCourseByCode", () => {
  it("forwards the code to courses.getByCourseCode", async () => {
    const course = { code: "IS111" };
    m.getByCourseCode.mockResolvedValue(course);

    await expect(getCourseByCode("IS111")).resolves.toBe(course);
    expect(m.getByCourseCode).toHaveBeenCalledWith({ code: "IS111" });
  });
});

describe("getProfessorBySlug", () => {
  it("forwards the slug to professors.getBySlug", async () => {
    const professor = { slug: "ada-lovelace" };
    m.getBySlug.mockResolvedValue(professor);

    await expect(getProfessorBySlug("ada-lovelace")).resolves.toBe(professor);
    expect(m.getBySlug).toHaveBeenCalledWith({ slug: "ada-lovelace" });
  });
});
