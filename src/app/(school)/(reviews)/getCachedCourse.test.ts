import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCachedCourse } from "./getCachedCourse";

// The module pulls the RSC `api` caller (which starts with `import "server-only"`),
// so mock it with the factory form; the fn is hoisted so the factory can close over it.
const m = vi.hoisted(() => ({
  getByCourseCode: vi.fn(),
}));

vi.mock("@/common/tools/trpc/server", () => ({
  api: {
    courses: { getByCourseCode: m.getByCourseCode },
  },
}));

beforeEach(() => vi.clearAllMocks());

describe("getCachedCourse", () => {
  it("normalises the code to uppercase before the lookup", async () => {
    m.getByCourseCode.mockResolvedValue({ code: "IS111", name: "Python" });

    await getCachedCourse("is111");

    expect(m.getByCourseCode).toHaveBeenCalledWith({ code: "IS111" });
  });

  it("returns the looked-up course", async () => {
    const course = { code: "IS111", name: "Python" };
    m.getByCourseCode.mockResolvedValue(course);

    await expect(getCachedCourse("IS111")).resolves.toEqual(course);
  });
});
