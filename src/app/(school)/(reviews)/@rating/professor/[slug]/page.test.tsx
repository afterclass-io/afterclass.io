// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, getAllByTypeMock, getMetadataForProfMock } = vi.hoisted(
  () => ({
    authMock: vi.fn(),
    getAllByTypeMock: vi.fn(),
    getMetadataForProfMock: vi.fn(),
  }),
);

vi.mock("@/server/auth", () => ({ auth: authMock }));
vi.mock("@/common/tools/trpc/server", () => ({
  api: {
    labels: { getAllByType: getAllByTypeMock },
    reviews: { getMetadataForProf: getMetadataForProfMock },
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

import ProfessorRating from "./page";

const professorLabels = [{ name: "knowledgeable" }, { name: "engaging" }];

describe("ProfessorRating (@rating/professor/[slug])", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllByTypeMock.mockResolvedValue(professorLabels);
  });

  it("renders locked placeholders and skips metadata when signed out", async () => {
    authMock.mockResolvedValue(null);

    const element = await ProfessorRating({
      params: Promise.resolve({ slug: "lee-wei" }),
    });
    const { container } = render(element);

    expect(getMetadataForProfMock).not.toHaveBeenCalled();
    expect(getAllByTypeMock).toHaveBeenCalledWith({ typeOf: "PROFESSOR" });
    expect(screen.getByText("Knowledgeable")).toBeInTheDocument();
    expect(screen.getByText("Engaging")).toBeInTheDocument();
    expect(container.innerHTML.replace(/_r_\w+_/g, "_r_")).toMatchSnapshot();
  });

  it("renders dashes when the professor has no reviews", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    getMetadataForProfMock.mockResolvedValue({
      averageRating: 0,
      reviewCount: 0,
      reviewLabels: [],
    });

    const element = await ProfessorRating({
      params: Promise.resolve({ slug: "lee-wei" }),
    });
    const { container } = render(element);

    expect(screen.getByText("No Ratings")).toBeInTheDocument();
    expect(container.innerHTML.replace(/_r_\w+_/g, "_r_")).toMatchSnapshot();
  });

  it("forwards the slug and course codes from an array", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    getMetadataForProfMock.mockResolvedValue({
      averageRating: 4.857,
      reviewCount: 4,
      reviewLabels: [
        { name: "Engaging", count: 3 },
        { name: "Fair Grading", count: 0 },
      ],
    });

    const element = await ProfessorRating({
      params: Promise.resolve({ slug: "lee-wei" }),
      searchParams: Promise.resolve({ course: ["CS1010", "CS2030"] }),
    });
    const { container } = render(element);

    expect(getMetadataForProfMock).toHaveBeenCalledWith({
      slug: "lee-wei",
      withCourseCodes: ["CS1010", "CS2030"],
    });
    expect(screen.getByText("4.86")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(container.innerHTML.replace(/_r_\w+_/g, "_r_")).toMatchSnapshot();
  });

  it("wraps a single course code and omits the filter when absent", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    getMetadataForProfMock.mockResolvedValue({
      averageRating: 3,
      reviewCount: 1,
      reviewLabels: [{ name: "Engaging", count: 1 }],
    });

    await ProfessorRating({
      params: Promise.resolve({ slug: "lee-wei" }),
      searchParams: Promise.resolve({ course: "CS1010" }),
    });
    expect(getMetadataForProfMock).toHaveBeenLastCalledWith({
      slug: "lee-wei",
      withCourseCodes: ["CS1010"],
    });

    await ProfessorRating({ params: Promise.resolve({ slug: "lee-wei" }) });
    expect(getMetadataForProfMock).toHaveBeenLastCalledWith({
      slug: "lee-wei",
      withCourseCodes: undefined,
    });
  });
});
