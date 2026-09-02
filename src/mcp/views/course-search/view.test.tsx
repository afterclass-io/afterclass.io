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
import { useDynamicTool, useHostContext, useToolContext, useViewTheme } from "mcp-use/react";

const mockedUseToolContext = vi.mocked(useToolContext);
const mockedUseViewTheme = vi.mocked(useViewTheme);
const mockedUseHostContext = vi.mocked(useHostContext);
const mockedUseDynamicTool = vi.mocked(useDynamicTool);

const sampleResult = {
  id: "c1",
  code: "ACC101",
  name: "Financial Accounting",
  creditUnits: 3,
  sections: [
    {
      classId: "cl1",
      section: "G1",
      professorName: "Prof Lim",
      timings: [
        {
          dayOfWeek: "MON",
          startTime: "10:00",
          endTime: "12:00",
          venue: "SR 3-1",
        },
      ],
    },
    { classId: "cl2", section: "G2", professorName: null, timings: [] },
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
    seedContext({ status: "pending", toolInput: { query: "ACC" } });
    const { container } = render(<CourseSearchView />);
    expect(container.querySelector("[aria-label='Loading']")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders the result count and each course when ready", () => {
    seedContext({
      status: "ready",
      toolInput: { query: "ACC" },
      toolOutput: { results: [sampleResult] },
    });
    render(<CourseSearchView />);
    expect(screen.getByText("1 course(s) found")).toBeInTheDocument();
    expect(screen.getByText(/ACC101/)).toBeInTheDocument();
    expect(screen.getByText(/Financial Accounting/)).toBeInTheDocument();
    expect(screen.getByText(/3 CU/)).toBeInTheDocument();
  });

  it("renders sections, professor names and TBA fallbacks", () => {
    seedContext({
      status: "ready",
      toolInput: { query: "ACC" },
      toolOutput: { results: [sampleResult] },
    });
    render(<CourseSearchView />);
    expect(screen.getAllByText(/G1/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Prof Lim/)).toBeInTheDocument();
    expect(screen.getAllByText(/G2/).length).toBeGreaterThan(0);
    expect(screen.getByText(/TBA/)).toBeInTheDocument();
    expect(screen.getByText(/MON 10:00–12:00 @ SR 3-1/)).toBeInTheDocument();
  });

  it("renders an empty state for zero results", () => {
    seedContext({ status: "ready", toolInput: { query: "ZZZ" }, toolOutput: { results: [] } });
    render(<CourseSearchView />);
    expect(screen.getByText("No courses found")).toBeInTheDocument();
  });

  it("renders an error alert when the tool fails", () => {
    seedContext({ status: "error", toolInput: {}, error: { message: "boom" } });
    render(<CourseSearchView />);
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
  });
});

describe("CourseSearchView CTA (v2 useDynamicTool)", () => {
  it("Add G1 button calls add-class-to-timetable with classId cl1", async () => {
    const callTool = vi.fn().mockResolvedValue({ structuredContent: {} });
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({
      status: "ready",
      toolInput: { query: "ACC" },
      toolOutput: { results: [sampleResult] },
    });
    render(<CourseSearchView />);
    fireEvent.click(screen.getByRole("button", { name: "Add G1" }));
    await waitFor(() => expect(callTool).toHaveBeenCalledTimes(1));
    expect(callTool).toHaveBeenCalledWith({ classId: "cl1" });
  });

  it("does not render an Add button when classId is missing", () => {
    const noIdResult = {
      ...sampleResult,
      sections: [{ section: "G3", professorName: "Prof Tan", timings: [] }],
    };
    seedContext({
      status: "ready",
      toolInput: { query: "ACC" },
      toolOutput: { results: [noIdResult] },
    });
    render(<CourseSearchView />);
    expect(screen.queryByRole("button", { name: "Add G3" })).toBeNull();
  });

  it("does not render Add buttons when the host bridge is unavailable", () => {
    mockedUseHostContext.mockReturnValue({ isAvailable: false } as never);
    seedContext({
      status: "ready",
      toolInput: { query: "ACC" },
      toolOutput: { results: [sampleResult] },
    });
    render(<CourseSearchView />);
    expect(screen.queryByRole("button", { name: "Add G1" })).toBeNull();
  });

  it("shows Saved feedback after a successful add-class-to-timetable", async () => {
    const callTool = vi.fn().mockResolvedValue({ structuredContent: {} });
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({
      status: "ready",
      toolInput: { query: "ACC" },
      toolOutput: { results: [sampleResult] },
    });
    render(<CourseSearchView />);
    fireEvent.click(screen.getByRole("button", { name: "Add G1" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Saved/ })).toBeInTheDocument(),
    );
  });

  it("shows Failed feedback when callTool rejects (v2 tool errors reject)", async () => {
    const callTool = vi.fn().mockRejectedValue(new Error("rate limited"));
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({
      status: "ready",
      toolInput: { query: "ACC" },
      toolOutput: { results: [sampleResult] },
    });
    render(<CourseSearchView />);
    fireEvent.click(screen.getByRole("button", { name: "Add G1" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Failed/ })).toBeInTheDocument(),
    );
  });
});
