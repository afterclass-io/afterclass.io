// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth", () => ({ auth: async () => null }));
vi.mock("@/server/ecfg/public-data", () => ({
  canViewData: async () => true,
}));

const { getCourseByCodeMock, notFoundMock } = vi.hoisted(() => ({
  getCourseByCodeMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/modules/reviews/functions/getCourseByCode", () => ({
  getCourseByCode: getCourseByCodeMock,
}));
vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  usePathname: () => null,
}));

import CourseHeader from "./page";

describe("CourseHeader (@header/course/[code])", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("looks up the uppercased code and renders the course name and school", async () => {
    getCourseByCodeMock.mockResolvedValue({
      name: "Introduction to Computing",
      belongToUniversity: { abbrv: "SMU" },
    });

    const element = await CourseHeader({
      params: Promise.resolve({ code: "cs1010" }),
    });
    const { container } = render(element);

    expect(getCourseByCodeMock).toHaveBeenCalledWith("CS1010");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Introduction to Computing",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("SMU")).toBeInTheDocument();
    expect(container.innerHTML.replace(/_r_\w+_/g, "_r_")).toMatchSnapshot();
  });

  it("calls notFound when the course does not exist", async () => {
    getCourseByCodeMock.mockResolvedValue(null);

    await expect(
      CourseHeader({ params: Promise.resolve({ code: "xx9999" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getCourseByCodeMock).toHaveBeenCalledWith("XX9999");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });
});
