// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the whole mcp-use/react surface the View consumes (v2 contract) —
// unlike the v1 widget tests, nothing seeds window.openai or mcpUseParams.
vi.mock("mcp-use/react", () => ({
  useToolContext: vi.fn(),
  useViewTheme: vi.fn(),
  useHostContext: vi.fn(),
  useDynamicTool: vi.fn(),
  // viewConfig is validated by bootstrapView at runtime in prod; the test only
  // needs the type to exist, so nothing else is mocked.
}));

import CourseSearchView, { viewConfig } from "./view";
import {
  useDynamicTool,
  useHostContext,
  useToolContext,
  useViewTheme,
} from "mcp-use/react";

const mockedUseToolContext = vi.mocked(useToolContext);
const mockedUseViewTheme = vi.mocked(useViewTheme);
const mockedUseHostContext = vi.mocked(useHostContext);
const mockedUseDynamicTool = vi.mocked(useDynamicTool);

const sampleResult = {
  id: "c1",
  code: "IS215",
  name: "Digital Business - Technologies and Transformation",
  creditUnits: 4,
  sections: [
    {
      classId: "seed-ay202627t1-is215-g1",
      section: "G1",
      professorName: "Yixin CAO",
      timings: [
        {
          dayOfWeek: "Mon",
          startTime: "08:15",
          endTime: "11:30",
          venue: "SOE/SCIS2 Seminar Room 2-1",
        },
      ],
    },
    {
      classId: "seed-ay202627t1-is215-g2",
      section: "G2",
      professorName: null,
      timings: [],
    },
  ],
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
  mockedUseHostContext.mockReturnValue({
    isAvailable: true,
  } as never);
  mockedUseDynamicTool.mockReturnValue({
    callTool: vi.fn().mockResolvedValue({ structuredContent: {} }),
  } as never);
});

describe("CourseSearchView (v2)", () => {
  it("exports a viewConfig with autoResize and all display modes", () => {
    expect(viewConfig).toEqual({
      autoResize: true,
      displayModes: ["inline", "fullscreen", "pip"],
    });
  });

  it("shows the skeleton while pending (no toolOutput yet)", () => {
    seedContext({ status: "pending", toolInput: { query: "IS215" } });
    const { container } = render(<CourseSearchView />);
    expect(
      container.querySelector("[aria-label='Loading']"),
    ).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders the result count and each course when ready", () => {
    seedContext({
      status: "ready",
      toolInput: { query: "IS215" },
      toolOutput: { results: [sampleResult] },
    });
    render(<CourseSearchView />);
    expect(screen.getByText("1 course(s) found")).toBeInTheDocument();
    expect(screen.getByText(/IS215/)).toBeInTheDocument();
    expect(
      screen.getByText(/Digital Business - Technologies and Transformation/),
    ).toBeInTheDocument();
    expect(screen.getByText(/4 CU/)).toBeInTheDocument();
  });

  it("renders sections, professor names and TBA fallbacks", () => {
    seedContext({
      status: "ready",
      toolInput: { query: "IS215" },
      toolOutput: { results: [sampleResult] },
    });
    render(<CourseSearchView />);
    expect(screen.getAllByText(/G1/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Yixin CAO/)).toBeInTheDocument();
    expect(screen.getAllByText(/G2/).length).toBeGreaterThan(0);
    expect(screen.getByText(/TBA/)).toBeInTheDocument();
    expect(
      screen.getByText(/Mon 08:15–11:30 @ SOE\/SCIS2 Seminar Room 2-1/),
    ).toBeInTheDocument();
  });

  it.each(["Mon", "MON", "monday"])(
    "normalizes day casing %s to Mon",
    (dayOfWeek) => {
      seedContext({
        status: "ready",
        toolInput: { query: "IS215" },
        toolOutput: {
          results: [
            {
              ...sampleResult,
              sections: [
                {
                  classId: "seed-ay202627t1-is215-g3",
                  section: "G3",
                  professorName: "FANG Bingxu",
                  timings: [
                    {
                      dayOfWeek,
                      startTime: "15:30",
                      endTime: "18:45",
                      venue: "SCIS1 Seminar Room 3-4",
                    },
                  ],
                },
              ],
            },
          ],
        },
      });
      render(<CourseSearchView />);
      expect(
        screen.getByText(/Mon 15:30–18:45 @ SCIS1 Seminar Room 3-4/),
      ).toBeInTheDocument();
    },
  );

  it("omits the CU badge when creditUnits is undefined (no crash, no 'undefined' text)", () => {
    const noCuResult = { ...sampleResult };
    delete (noCuResult as { creditUnits?: number }).creditUnits;
    seedContext({
      status: "ready",
      toolInput: { query: "IS215" },
      toolOutput: { results: [noCuResult] },
    });
    render(<CourseSearchView />);
    expect(screen.getByText("1 course(s) found")).toBeInTheDocument();
    expect(screen.getByText(/IS215/)).toBeInTheDocument();
    expect(screen.queryByText(/CU/)).toBeNull();
    expect(screen.queryByText("undefined")).toBeNull();
  });

  it("renders an empty state for zero results", () => {
    seedContext({
      status: "ready",
      toolInput: { query: "ZZZ" },
      toolOutput: { results: [] },
    });
    render(<CourseSearchView />);
    expect(screen.getByText("No courses found")).toBeInTheDocument();
  });

  it("renders an error alert when the tool fails", () => {
    seedContext({ status: "error", toolInput: {}, error: { message: "boom" } });
    render(<CourseSearchView />);
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
  });

  it("renders the description paragraph when present", () => {
    seedContext({
      status: "ready",
      toolInput: { query: "digital" },
      toolOutput: {
        results: [
          {
            ...sampleResult,
            code: "IS215",
            name: "Digital Business - Technologies and Transformation",
            description: "What is taught in this course.",
          },
        ],
      },
    });
    render(<CourseSearchView />);
    expect(
      screen.getByText("What is taught in this course."),
    ).toBeInTheDocument();
  });

  it("hides the description block when absent", () => {
    seedContext({
      status: "ready",
      toolInput: { query: "IS215" },
      toolOutput: { results: [sampleResult] },
    });
    const { container } = render(<CourseSearchView />);
    expect(container.querySelector("p")).toBeNull();
  });

  it("root container fills host width (no maxWidth cap)", () => {
    seedContext({
      status: "ready",
      toolInput: { query: "IS215" },
      toolOutput: { results: [sampleResult] },
    });
    const { container } = render(<CourseSearchView />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.width).toBe("100%");
    expect(root.style.maxWidth).toBe("100%");
  });
});

describe("CourseSearchView CTA (v2 useDynamicTool)", () => {
  it("Add G1 button calls add-class-to-timetable with classId seed-ay202627t1-is215-g1", async () => {
    const callTool = vi.fn().mockResolvedValue({ structuredContent: {} });
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({
      status: "ready",
      toolInput: { query: "IS215" },
      toolOutput: { results: [sampleResult] },
    });
    render(<CourseSearchView />);
    fireEvent.click(screen.getByRole("button", { name: "Add G1 — confirm to enroll" }));
    await waitFor(() => expect(callTool).toHaveBeenCalledTimes(1));
    expect(callTool).toHaveBeenCalledWith({
      classId: "seed-ay202627t1-is215-g1",
    });
  });

  it("does not render an Add button when classId is missing", () => {
    const noIdResult = {
      ...sampleResult,
      sections: [{ section: "G3", professorName: "FANG Bingxu", timings: [] }],
    };
    seedContext({
      status: "ready",
      toolInput: { query: "IS215" },
      toolOutput: { results: [noIdResult] },
    });
    render(<CourseSearchView />);
    expect(screen.queryByRole("button", { name: "Add G3 — confirm to enroll" })).toBeNull();
  });

  it("does not render Add buttons when the host bridge is unavailable", () => {
    mockedUseHostContext.mockReturnValue({ isAvailable: false } as never);
    seedContext({
      status: "ready",
      toolInput: { query: "IS215" },
      toolOutput: { results: [sampleResult] },
    });
    render(<CourseSearchView />);
    expect(screen.queryByRole("button", { name: "Add G1 — confirm to enroll" })).toBeNull();
  });

  it("shows Saved feedback after a successful add-class-to-timetable", async () => {
    const callTool = vi.fn().mockResolvedValue({ structuredContent: {} });
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({
      status: "ready",
      toolInput: { query: "IS215" },
      toolOutput: { results: [sampleResult] },
    });
    render(<CourseSearchView />);
    fireEvent.click(screen.getByRole("button", { name: "Add G1 — confirm to enroll" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Saved/ })).toBeInTheDocument(),
    );
  });

  it("shows Failed feedback when callTool rejects (v2 tool errors reject)", async () => {
    const callTool = vi.fn().mockRejectedValue(new Error("rate limited"));
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({
      status: "ready",
      toolInput: { query: "IS215" },
      toolOutput: { results: [sampleResult] },
    });
    render(<CourseSearchView />);
    fireEvent.click(screen.getByRole("button", { name: "Add G1 — confirm to enroll" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Failed/ }),
      ).toBeInTheDocument(),
    );
  });
});
