// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  getAllByCourseId: vi.fn(),
  getCurrentWindow: vi.fn(),
}));

vi.mock("@/common/tools/trpc/server", () => ({
  api: {
    classes: { getAllByCourseId: m.getAllByCourseId },
    bidWindows: { getCurrentWindow: m.getCurrentWindow },
  },
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { DetailCard } from "./DetailCard";

const course = { id: "c1", code: "CS1010", creditUnits: 1 } as Parameters<
  typeof DetailCard
>[0]["course"];

describe("DetailCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.getCurrentWindow.mockResolvedValue({ acadTermId: "t1" });
    m.getAllByCourseId.mockResolvedValue([
      { courseOutlineUrl: "https://outline.test" },
      {},
    ]);
  });

  it("shows the outline link and bidding section when class data is viewable", async () => {
    render(await DetailCard({ course, canViewClassData: true }));
    expect(screen.getByText("Course Description")).toBeVisible();
    expect(screen.getByText("View Bidding Trends")).toBeVisible();
    expect(screen.getByText("2 sections available")).toBeVisible();
  });

  it("skips class and bid-window calls and keeps the rest when class data is private", async () => {
    const { container } = render(
      await DetailCard({ course, canViewClassData: false }),
    );
    expect(m.getCurrentWindow).not.toHaveBeenCalled();
    expect(m.getAllByCourseId).not.toHaveBeenCalled();
    expect(
      container.querySelector('[data-test="course-code"]'),
    ).toHaveTextContent("CS1010");
    expect(screen.queryByText("View Bidding Trends")).toBeNull();
    expect(screen.queryByText("Course Description")).toBeNull();
  });
});
