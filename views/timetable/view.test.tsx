// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the whole mcp-use/react surface the View consumes (v2 contract) —
// unlike the v1 widget tests, nothing seeds window.openai or mcpUseParams.
vi.mock("mcp-use/react", () => ({
  useToolContext: vi.fn(),
  useViewTheme: vi.fn(),
}));

import TimetableView, { viewConfig } from "./view";
import { useToolContext, useViewTheme } from "mcp-use/react";

const mockedUseToolContext = vi.mocked(useToolContext);
const mockedUseViewTheme = vi.mocked(useViewTheme);

const fullProps = {
  timetableId: "tt1",
  name: "My Timetable",
  isActive: true,
  slots: [
    {
      classId: "c1",
      courseCode: "ACCT102",
      courseName: "Management Accounting",
      section: "G1",
      day: "Mon",
      startTime: "08:15",
      endTime: "11:30",
      venue: "SOE/SR3-1",
      professor: "FANG Bingxu",
      creditUnits: 4,
    },
    {
      classId: "c1",
      courseCode: "ACCT102",
      courseName: "Management Accounting",
      section: "G1",
      day: "Wed",
      startTime: "08:15",
      endTime: "11:30",
      venue: "SOE/SR3-1",
      professor: "FANG Bingxu",
      creditUnits: 4,
    },
    {
      classId: "c2",
      courseCode: "COR-IS1702",
      courseName: "Computational Thinking",
      section: "G2",
      day: "Mon",
      startTime: "09:00",
      endTime: "10:00",
      venue: "SIS/SR2-3",
      professor: null,
      creditUnits: 4,
    },
    {
      classId: "c3",
      courseCode: "STAT203",
      courseName: "Financial Mathematics",
      section: "G5",
      day: "Tue",
      startTime: "12:00",
      endTime: "15:15",
      venue: null,
      professor: "Yixin CAO",
      creditUnits: 4,
    },
  ],
  examTimings: [],
};

function seedContext(
  handle: Partial<{
    status: "pending" | "ready" | "error";
    toolInput: unknown;
    toolOutput: unknown;
    error: { message: string };
  }>,
) {
  mockedUseToolContext.mockReturnValue(handle as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseViewTheme.mockReturnValue("light");
});

describe("TimetableView (v2)", () => {
  it("exports a viewConfig with autoResize and all display modes", () => {
    expect(viewConfig).toEqual({
      autoResize: true,
      displayModes: ["inline", "fullscreen", "pip"],
    });
  });

  it("shows the skeleton while pending (no toolOutput yet)", () => {
    seedContext({ status: "pending", toolInput: {} });
    const { container } = render(<TimetableView />);
    expect(
      container.querySelector("[aria-label='Loading']"),
    ).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders class blocks with code, section, venue and professor", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<TimetableView />);
    // ACCT102 appears twice (Mon + Wed timings); COR-IS1702 overlaps it on Mon.
    expect(screen.getAllByText("ACCT102").length).toBe(2);
    expect(screen.getByText("COR-IS1702")).toBeInTheDocument();
    expect(screen.getByText("STAT203")).toBeInTheDocument();
    expect(screen.getAllByText("G1").length).toBe(2);
    expect(screen.getAllByText("SOE/SR3-1").length).toBe(2);
    expect(screen.getAllByText("FANG Bingxu").length).toBe(2);
  });

  it("renders day-column headers Mon-Fri in order", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<TimetableView />);
    const headers = screen.getAllByText(/^(Mon|Tue|Wed|Thu|Fri)$/);
    expect(headers.map((h) => h.textContent)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
    ]);
  });

  it("labels the clash story: overlapping Monday blocks stack side by side (no full overlap)", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    const { container } = render(<TimetableView />);
    const cards = container.querySelectorAll(
      '[data-test="timetable-class-card"]',
    );
    // 4 flat slots -> 4 cards; the two Monday cards share an overlap group of 2.
    expect(cards).toHaveLength(4);
    const mondayCards = [...cards].filter(
      (c) => c.getAttribute("data-day") === "Mon",
    );
    expect(mondayCards).toHaveLength(2);
    for (const card of mondayCards) {
      expect(card.getAttribute("data-overlap-count")).toBe("2");
      const width = Number(card.getAttribute("data-width-pct"));
      expect(width).toBeLessThan(100);
    }
  });

  it("renders hour ticks across the full grid height (08:00–22:00)", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<TimetableView />);
    // fullProps classes end at 15:15 — a data-scoped axis would stop at 15:00.
    expect(screen.getByText("08:00")).toBeInTheDocument();
    expect(screen.getByText("22:00")).toBeInTheDocument();
  });

  it("pins the final tick inside the axis so the grid never scrolls vertically", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    const { container } = render(<TimetableView />);
    expect(screen.getByText("22:00").style.transform).toBe("translateY(-100%)");
    // The grid wrapper must only scroll horizontally — never vertically.
    const scrollers = [...container.querySelectorAll("div")].filter((el) => {
      const overflowY = el.style.overflowY;
      return overflowY === "auto" || overflowY === "scroll";
    });
    expect(scrollers).toHaveLength(0);
  });

  it("shows the timetable name in the header", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<TimetableView />);
    expect(screen.getByText("My Timetable")).toBeInTheDocument();
  });

  it("shows empty state when there are no classes", () => {
    seedContext({
      status: "ready",
      toolInput: {},
      toolOutput: { ...fullProps, slots: [] },
    });
    render(<TimetableView />);
    expect(
      screen.getByText("No classes in this timetable yet."),
    ).toBeInTheDocument();
  });

  it("renders exam rows in the adapter's real shape", () => {
    seedContext({
      status: "ready",
      toolInput: {},
      toolOutput: {
        ...fullProps,
        examTimings: [
          {
            classId: "c1",
            courseCode: "ACCT102",
            section: "G1",
            date: "2026-04-20T00:00:00.000Z",
            dayOfWeek: "Mon",
            startTime: "09:00",
            endTime: "11:00",
            venue: "MPSH 1",
          },
        ],
      },
    });
    const { container } = render(<TimetableView />);
    expect(screen.getByText("Exams")).toBeInTheDocument();
    const rows = container.querySelectorAll('[data-test="timetable-exam-row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("ACCT102");
    expect(rows[0]).toHaveTextContent(/2026-04-20.*09:00–11:00 @ MPSH 1/);
  });

  it("drops a day:null slot gracefully (other slots still render, no crash)", () => {
    seedContext({
      status: "ready",
      toolInput: {},
      toolOutput: {
        ...fullProps,
        slots: [
          ...fullProps.slots,
          {
            classId: "c9",
            courseCode: "GHOST101",
            courseName: "Ghost Class",
            section: "G9",
            day: null,
            startTime: "10:00",
            endTime: "12:00",
            venue: "SR1",
            professor: null,
            creditUnits: 1,
          },
        ],
      },
    });
    const { container } = render(<TimetableView />);
    // 4 real flat slots -> 4 cards; the null-day slot is dropped, never shown.
    const cards = container.querySelectorAll(
      '[data-test="timetable-class-card"]',
    );
    expect(cards).toHaveLength(4);
    expect(screen.queryByText("GHOST101")).toBeNull();
    expect(screen.queryByText("null")).toBeNull();
  });

  it("renders normally when isActive is false (flag is informational, not a gate)", () => {
    seedContext({
      status: "ready",
      toolInput: {},
      toolOutput: { ...fullProps, isActive: false },
    });
    const { container } = render(<TimetableView />);
    expect(screen.getByText("My Timetable")).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-test="timetable-class-card"]'),
    ).toHaveLength(4);
  });

  it("renders an error alert when the tool fails", () => {
    seedContext({ status: "error", toolInput: {}, error: { message: "boom" } });
    render(<TimetableView />);
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
  });
});
