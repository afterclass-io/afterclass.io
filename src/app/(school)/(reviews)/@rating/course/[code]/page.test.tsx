// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/ecfg/public-data", () => ({
  canViewData: async () => true,
}));

const { authMock, getAllByTypeMock, getMetadataForCourseMock } = vi.hoisted(
  () => ({
    authMock: vi.fn(),
    getAllByTypeMock: vi.fn(),
    getMetadataForCourseMock: vi.fn(),
  }),
);

vi.mock("@/server/auth", () => ({ auth: authMock }));
vi.mock("@/common/tools/trpc/server", () => ({
  api: {
    labels: { getAllByType: getAllByTypeMock },
    reviews: { getMetadataForCourse: getMetadataForCourseMock },
  },
}));
vi.mock("next/navigation", () => ({
  usePathname: () => null,
  useRouter: () => ({ push: vi.fn() }),
}));
// CtaButton/ProgressLink inside LockedOverlay need the progress context.
vi.mock("@/common/providers/ProgressProvider", () => ({
  useProgress: () => ({ start: vi.fn(), done: vi.fn() }),
}));

import CourseRating from "./page";

const courseLabels = [{ name: "fair_grading" }, { name: "engaging" }];

describe("CourseRating (@rating/course/[code])", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllByTypeMock.mockResolvedValue(courseLabels);
  });

  it("renders locked placeholders and skips metadata when signed out", async () => {
    authMock.mockResolvedValue(null);

    const element = await CourseRating({
      params: Promise.resolve({ code: "cs1010" }),
    });
    const { container } = render(element);

    expect(getMetadataForCourseMock).not.toHaveBeenCalled();
    expect(getAllByTypeMock).toHaveBeenCalledWith({ typeOf: "COURSE" });
    expect(screen.getByText("Fair Grading")).toBeInTheDocument();
    expect(screen.getByText("Engaging")).toBeInTheDocument();
    expect(container.innerHTML.replace(/_r_\w+_/g, "_r_")).toMatchSnapshot();
  });

  it("renders dashes when the course has no reviews", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    getMetadataForCourseMock.mockResolvedValue({
      averageRating: 0,
      reviewCount: 0,
      reviewLabels: [],
    });

    const element = await CourseRating({
      params: Promise.resolve({ code: "cs1010" }),
    });
    const { container } = render(element);

    expect(screen.getByText("No Ratings")).toBeInTheDocument();
    expect(container.innerHTML.replace(/_r_\w+_/g, "_r_")).toMatchSnapshot();
  });

  it("uppercases the code and forwards professor slugs from an array", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    getMetadataForCourseMock.mockResolvedValue({
      averageRating: 4.857,
      reviewCount: 4,
      reviewLabels: [
        { name: "Engaging", count: 3 },
        { name: "Fair Grading", count: 0 },
      ],
    });

    const element = await CourseRating({
      params: Promise.resolve({ code: "cs1010" }),
      searchParams: Promise.resolve({ professor: ["lee", "tan"] }),
    });
    const { container } = render(element);

    expect(getMetadataForCourseMock).toHaveBeenCalledWith({
      code: "CS1010",
      withProfSlugs: ["lee", "tan"],
    });
    expect(screen.getByText("4.86")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(container.innerHTML.replace(/_r_\w+_/g, "_r_")).toMatchSnapshot();
  });

  it("wraps a single professor slug and omits the filter when absent", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    getMetadataForCourseMock.mockResolvedValue({
      averageRating: 3,
      reviewCount: 1,
      reviewLabels: [{ name: "Engaging", count: 1 }],
    });

    await CourseRating({
      params: Promise.resolve({ code: "cs1010" }),
      searchParams: Promise.resolve({ professor: "lee" }),
    });
    expect(getMetadataForCourseMock).toHaveBeenLastCalledWith({
      code: "CS1010",
      withProfSlugs: ["lee"],
    });

    await CourseRating({ params: Promise.resolve({ code: "cs1010" }) });
    expect(getMetadataForCourseMock).toHaveBeenLastCalledWith({
      code: "CS1010",
      withProfSlugs: undefined,
    });
  });
});
