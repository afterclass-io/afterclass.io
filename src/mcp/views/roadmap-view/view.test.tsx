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
}));

import RoadmapView, { viewConfig } from "./view";
import { useDynamicTool, useHostContext, useToolContext, useViewTheme } from "mcp-use/react";

const mockedUseToolContext = vi.mocked(useToolContext);
const mockedUseViewTheme = vi.mocked(useViewTheme);
const mockedUseHostContext = vi.mocked(useHostContext);
const mockedUseDynamicTool = vi.mocked(useDynamicTool);

const publicProps = {
  roadmapId: "r1",
  name: "BSc IS (Community)",
  isPublic: true,
  owner: "senior123",
  voteCount: 42,
  entries: [
    { yearNumber: 1, term: "T1", courseCode: "CS101", courseName: "Intro to CS", creditUnits: 1 },
    { yearNumber: 1, term: "T2", courseCode: "CS102", courseName: "Data Structures", creditUnits: 1 },
    { yearNumber: 2, term: "T1", courseCode: "CS201", courseName: "Algorithms", creditUnits: 1 },
  ],
};

const privateProps = {
  ...publicProps,
  isPublic: false,
  owner: null,
  voteCount: null,
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

describe("RoadmapView (v2)", () => {
  it("exports a viewConfig with autoResize and all display modes", () => {
    expect(viewConfig).toEqual({
      autoResize: true,
      displayModes: ["inline", "fullscreen", "pip"],
    });
  });

  it("shows the skeleton while pending (no toolOutput yet)", () => {
    seedContext({ status: "pending", toolInput: {} });
    const { container } = render(<RoadmapView />);
    expect(container.querySelector("[aria-label='Loading']")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders year headings, term labels, and course codes", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: publicProps });
    render(<RoadmapView />);
    expect(screen.getByText("Year 1")).toBeInTheDocument();
    expect(screen.getByText("Year 2")).toBeInTheDocument();
    expect(screen.getAllByText("T1").length).toBe(2);
    expect(screen.getByText("T2")).toBeInTheDocument();
    expect(screen.getByText("CS101")).toBeInTheDocument();
    expect(screen.getByText("CS102")).toBeInTheDocument();
    expect(screen.getByText("CS201")).toBeInTheDocument();
  });

  it("public: renders owner and vote count", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: publicProps });
    render(<RoadmapView />);
    expect(screen.getByText(/senior123/)).toBeInTheDocument();
    expect(screen.getByText(/42 upvotes/)).toBeInTheDocument();
  });

  it("private: does not render owner or vote count", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: privateProps });
    render(<RoadmapView />);
    expect(screen.queryByText(/senior123/)).toBeNull();
    expect(screen.queryByText(/upvotes/)).toBeNull();
  });

  it("shows empty state when there are no entries", () => {
    seedContext({
      status: "ready",
      toolInput: {},
      toolOutput: { ...privateProps, entries: [] },
    });
    render(<RoadmapView />);
    expect(screen.getByText("No courses in this roadmap yet.")).toBeInTheDocument();
  });

  it("renders a post-mutation roadmap (buildRoadmapView shape) with new entries", () => {
    // Write tools (create/copy/save) return roadmap-view via buildRoadmapView;
    // the View receives the normalized shape as toolOutput.
    const mutatedProps = {
      roadmapId: "r2",
      name: "Senior Plan (copy)",
      isPublic: false,
      owner: null,
      voteCount: null,
      entries: [
        { yearNumber: 1, term: "T1", courseCode: "COR-STAT1202", courseName: "Stats", creditUnits: 1 },
        { yearNumber: 1, term: "T2", courseCode: "CS102", courseName: "Data Structures", creditUnits: 1 },
      ],
    };
    seedContext({ status: "ready", toolInput: {}, toolOutput: mutatedProps });
    render(<RoadmapView />);
    expect(screen.getByText("Senior Plan (copy)")).toBeInTheDocument();
    expect(screen.getByText("COR-STAT1202")).toBeInTheDocument();
    expect(screen.getByText("CS102")).toBeInTheDocument();
  });

  it("renders an error alert when the tool fails", () => {
    seedContext({ status: "error", toolInput: {}, error: { message: "boom" } });
    render(<RoadmapView />);
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
  });
});

describe("RoadmapView copy CTA (v2 useDynamicTool)", () => {
  it("Copy this roadmap button calls copy-public-roadmap with roadmapId", async () => {
    const callTool = vi.fn().mockResolvedValue({ structuredContent: {} });
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({ status: "ready", toolInput: {}, toolOutput: publicProps });
    render(<RoadmapView />);
    fireEvent.click(screen.getByRole("button", { name: /Copy this roadmap/i }));
    await waitFor(() => expect(callTool).toHaveBeenCalledTimes(1));
    expect(callTool).toHaveBeenCalledWith({ roadmapId: "r1" });
  });

  it("does not render CTA for private roadmaps", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: privateProps });
    render(<RoadmapView />);
    expect(screen.queryByRole("button", { name: /Copy this roadmap/i })).toBeNull();
  });

  it("does not render CTA when the host bridge is unavailable", () => {
    mockedUseHostContext.mockReturnValue({ isAvailable: false } as never);
    seedContext({ status: "ready", toolInput: {}, toolOutput: publicProps });
    render(<RoadmapView />);
    expect(screen.queryByRole("button", { name: /Copy this roadmap/i })).toBeNull();
  });

  it("shows Copied feedback after successful copy-public-roadmap", async () => {
    const callTool = vi.fn().mockResolvedValue({ structuredContent: {} });
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({ status: "ready", toolInput: {}, toolOutput: publicProps });
    render(<RoadmapView />);
    fireEvent.click(screen.getByRole("button", { name: /Copy this roadmap/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Copied/ })).toBeInTheDocument(),
    );
  });

  it("shows Copy failed when callTool rejects (v2 tool errors reject)", async () => {
    const callTool = vi.fn().mockRejectedValue(new Error("failed"));
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({ status: "ready", toolInput: {}, toolOutput: publicProps });
    render(<RoadmapView />);
    fireEvent.click(screen.getByRole("button", { name: /Copy this roadmap/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Copy failed/ })).toBeInTheDocument(),
    );
  });
});
