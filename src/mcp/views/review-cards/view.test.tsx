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

import ReviewCardsView, { viewConfig } from "./view";
import { useToolContext, useViewTheme } from "mcp-use/react";

const mockedUseToolContext = vi.mocked(useToolContext);
const mockedUseViewTheme = vi.mocked(useViewTheme);

const fullProps = {
  context: "COR-MGMT1202",
  reviews: [
    {
      id: "rv1",
      body: "Heavy group work but fair grading.",
      tips: "Start the project early.",
      rating: 4,
      labels: ["Group Work", "Fair"],
      voteCount: 12,
      createdAt: "2026-01-15T00:00:00.000Z",
      courseCode: "COR-MGMT1202",
      professorName: "Prof X",
    },
    {
      id: "rv2",
      body: null,
      tips: null,
      rating: 2,
      labels: [],
      voteCount: 0,
      createdAt: "2026-02-01T00:00:00.000Z",
      courseCode: "COR-MGMT1202",
      professorName: null,
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
});

describe("ReviewCardsView (v2)", () => {
  it("exports a viewConfig with autoResize and all display modes", () => {
    expect(viewConfig).toEqual({
      autoResize: true,
      displayModes: ["inline", "fullscreen", "pip"],
    });
  });

  it("shows the skeleton while pending (no toolOutput yet)", () => {
    seedContext({ status: "pending", toolInput: {} });
    const { container } = render(<ReviewCardsView />);
    expect(container.querySelector("[aria-label='Loading']")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders the context header, body, tips, rating, labels, and vote count", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<ReviewCardsView />);
    expect(screen.getByText("Reviews")).toBeInTheDocument();
    expect(screen.getByText("COR-MGMT1202")).toBeInTheDocument();
    expect(
      screen.getByText("Heavy group work but fair grading."),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tips: Start the project early\./)).toBeInTheDocument();
    expect(screen.getByText("★ 4/5")).toBeInTheDocument();
    expect(screen.getByText("★ 2/5")).toBeInTheDocument();
    expect(screen.getByText("Group Work")).toBeInTheDocument();
    expect(screen.getByText("Fair")).toBeInTheDocument();
    expect(screen.getByText(/12 upvotes/)).toBeInTheDocument();
  });

  it("renders nothing for null body/tips rows (no 'null' text)", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<ReviewCardsView />);
    expect(screen.queryByText("null")).toBeNull();
    // Only the first review has body/tips.
    expect(screen.getAllByText(/^Tips:/).length).toBe(1);
  });

  it("shows empty state when there are no reviews", () => {
    seedContext({
      status: "ready",
      toolInput: {},
      toolOutput: { context: "CS101", reviews: [] },
    });
    render(<ReviewCardsView />);
    expect(screen.getByText("No reviews yet.")).toBeInTheDocument();
  });

  it("renders an error alert when the tool fails", () => {
    seedContext({ status: "error", toolInput: {}, error: { message: "boom" } });
    render(<ReviewCardsView />);
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
  });
});
