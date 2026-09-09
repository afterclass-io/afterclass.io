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
  context: "ACCT102",
  reviews: [
    {
      id: "rv1",
      body: "Heavy group work but fair grading.",
      tips: "Start the project early.",
      rating: 4,
      labels: ["Group Work", "Fair"],
      voteCount: 12,
      createdAt: "2026-01-15T00:00:00.000Z",
      courseCode: "ACCT102",
      professorName: "FANG Bingxu",
    },
    {
      id: "rv2",
      body: null,
      tips: null,
      rating: 2,
      labels: [],
      voteCount: 0,
      createdAt: "2026-02-01T00:00:00.000Z",
      courseCode: "ACCT102",
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
    expect(
      container.querySelector("[aria-label='Loading']"),
    ).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders the context header, body, tips, rating, labels, and vote count", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<ReviewCardsView />);
    expect(screen.getByText("Reviews")).toBeInTheDocument();
    expect(screen.getByText("ACCT102")).toBeInTheDocument();
    expect(
      screen.getByText("Heavy group work but fair grading."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Tips: Start the project early\./),
    ).toBeInTheDocument();
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
      toolOutput: { context: "ACCT102", reviews: [] },
    });
    render(<ReviewCardsView />);
    expect(screen.getByText("No reviews yet.")).toBeInTheDocument();
  });

  it("renders a professor-context payload (null courseCode, no crash)", () => {
    seedContext({
      status: "ready",
      toolInput: {},
      toolOutput: {
        context: "FANG Bingxu",
        reviews: [
          {
            id: "rv-p1",
            body: "Clear lectures.",
            tips: null,
            rating: 5,
            labels: ["Clear"],
            voteCount: 21,
            createdAt: "2026-03-10T00:00:00.000Z",
            courseCode: null,
            professorName: "FANG Bingxu",
          },
        ],
      },
    });
    render(<ReviewCardsView />);
    expect(screen.getByText("Reviews")).toBeInTheDocument();
    expect(screen.getByText("FANG Bingxu")).toBeInTheDocument();
    expect(screen.getByText("Clear lectures.")).toBeInTheDocument();
    expect(screen.getByText("★ 5/5")).toBeInTheDocument();
    expect(screen.queryByText("null")).toBeNull();
  });

  it("renders nothing for a rating:null review star (no crash, no 'null' text)", () => {
    seedContext({
      status: "ready",
      toolInput: {},
      toolOutput: {
        context: "ACCT102",
        reviews: [
          {
            id: "rv-null-rating",
            body: "Solid course.",
            tips: null,
            rating: null,
            labels: [],
            voteCount: 3,
            createdAt: "2026-02-01T00:00:00.000Z",
            courseCode: "ACCT102",
            professorName: null,
          },
        ],
      },
    });
    render(<ReviewCardsView />);
    expect(screen.getByText("Solid course.")).toBeInTheDocument();
    expect(screen.getByText(/3 upvotes/)).toBeInTheDocument();
    expect(screen.queryByText(/★/)).toBeNull();
    expect(screen.queryByText("null")).toBeNull();
  });

  it("renders gracefully when createdAt is the catalog empty-string default (no crash, no date shown)", () => {
    // reviewCardsProps coerces missing createdAt to "" (catalog.ts:81); the
    // View never renders the date, so the card must look identical to a
    // dated one minus nothing.
    seedContext({
      status: "ready",
      toolInput: {},
      toolOutput: {
        context: "ACCT102",
        reviews: [
          {
            id: "rv-empty-date",
            body: "Solid course.",
            tips: "Skim the readings.",
            rating: 4,
            labels: ["Fair"],
            voteCount: 3,
            createdAt: "",
            courseCode: "ACCT102",
            professorName: null,
          },
        ],
      },
    });
    render(<ReviewCardsView />);
    expect(screen.getByText("Solid course.")).toBeInTheDocument();
    expect(screen.getByText("★ 4/5")).toBeInTheDocument();
    expect(screen.queryByText("Invalid Date")).toBeNull();
    expect(screen.queryByText("null")).toBeNull();
  });

  it("renders an error alert when the tool fails", () => {
    seedContext({ status: "error", toolInput: {}, error: { message: "boom" } });
    render(<ReviewCardsView />);
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
  });
});
