// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth", () => ({ auth: async () => null }));
vi.mock("@/server/ecfg/public-data", () => ({
  canViewData: async () => true,
}));

const { getProfessorBySlugMock, notFoundMock } = vi.hoisted(() => ({
  getProfessorBySlugMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/modules/reviews/functions/getProfessorBySlug", () => ({
  getProfessorBySlug: getProfessorBySlugMock,
}));
vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  usePathname: () => null,
}));

import ProfessorHeader from "./page";

describe("ProfessorHeader (@header/professor/[slug])", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("looks up the slug and renders the professor name and school", async () => {
    getProfessorBySlugMock.mockResolvedValue({
      name: "Lee Wei",
      belongToUniversity: { abbrv: "SMU" },
    });

    const element = await ProfessorHeader({
      params: Promise.resolve({ slug: "lee-wei" }),
    });
    const { container } = render(element);

    expect(getProfessorBySlugMock).toHaveBeenCalledWith("lee-wei");
    expect(
      screen.getByRole("heading", { level: 1, name: "Lee Wei" }),
    ).toBeInTheDocument();
    expect(screen.getByText("SMU")).toBeInTheDocument();
    expect(container.innerHTML.replace(/_r_\w+_/g, "_r_")).toMatchSnapshot();
  });

  it("calls notFound when the professor does not exist", async () => {
    getProfessorBySlugMock.mockResolvedValue(null);

    await expect(
      ProfessorHeader({ params: Promise.resolve({ slug: "nobody" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });
});
