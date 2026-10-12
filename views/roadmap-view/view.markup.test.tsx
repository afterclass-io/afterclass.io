// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Characterization (markup) tests: pin the rendered card shell of the ready
// state (public and private roadmaps) so the shared card chrome can change
// without changing the output.
vi.mock("mcp-use/react", () => ({
  useToolContext: vi.fn(),
  useViewTheme: vi.fn(),
  useHostContext: vi.fn(),
  useDynamicTool: vi.fn(),
}));

import RoadmapView from "./view";
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

const publicOutput = {
  roadmapId: "r1",
  name: "BSc IS (Community)",
  isPublic: true,
  owner: "senior123",
  voteCount: 42,
  entries: [
    {
      yearNumber: 1,
      term: "T1",
      courseCode: "COR-IS1702",
      courseName: "Computational Thinking",
      creditUnits: 4,
    },
    {
      yearNumber: 2,
      term: "T1",
      courseCode: "STAT203",
      courseName: "Financial Mathematics",
      creditUnits: 4,
    },
  ],
};

const privateOutput = {
  ...publicOutput,
  isPublic: false,
  owner: null,
  voteCount: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseHostContext.mockReturnValue({
    isAvailable: true,
  } as never);
  mockedUseDynamicTool.mockReturnValue({
    callTool: vi.fn().mockResolvedValue({ structuredContent: {} }),
  } as never);
});

describe("RoadmapView markup", () => {
  it("public ready state keeps the card markup (light)", () => {
    mockedUseViewTheme.mockReturnValue("light");
    mockedUseToolContext.mockReturnValue({
      status: "ready",
      toolOutput: publicOutput,
    } as never);
    const { container } = render(<RoadmapView />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("private ready state keeps the card markup (dark)", () => {
    mockedUseViewTheme.mockReturnValue("dark");
    mockedUseToolContext.mockReturnValue({
      status: "ready",
      toolOutput: privateOutput,
    } as never);
    const { container } = render(<RoadmapView />);
    expect(container.innerHTML).toMatchSnapshot();
  });
});
