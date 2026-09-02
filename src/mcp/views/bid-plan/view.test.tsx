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

import BidPlanView, { viewConfig } from "./view";
import { useToolContext, useViewTheme } from "mcp-use/react";

const mockedUseToolContext = vi.mocked(useToolContext);
const mockedUseViewTheme = vi.mocked(useViewTheme);

const fullProps = {
  acadTermId: "AY2026/27-T1",
  budget: { balance: 987.5 },
  bids: [
    {
      id: "b1",
      bidAmount: 25,
      status: "PLANNED",
      courseCode: "ACC101",
      courseName: "Financial Accounting",
      section: "G1",
      professorName: "Prof X",
      round: "1",
      window: 1,
    },
    {
      id: "b2",
      bidAmount: 51,
      status: "SECURED",
      courseCode: "FIN201",
      courseName: "Finance",
      section: "G3",
      professorName: null,
      round: "1A",
      window: 2,
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

describe("BidPlanView (v2)", () => {
  it("exports a viewConfig with autoResize and all display modes", () => {
    expect(viewConfig).toEqual({
      autoResize: true,
      displayModes: ["inline", "fullscreen", "pip"],
    });
  });

  it("shows the skeleton while pending (no toolOutput yet)", () => {
    seedContext({ status: "pending", toolInput: {} });
    const { container } = render(<BidPlanView />);
    expect(container.querySelector("[aria-label='Loading']")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders budget balance and per-bid courseCode, amount, status chip when ready", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidPlanView />);
    expect(screen.getByText(/987\.5/)).toBeInTheDocument();
    expect(screen.getByText("ACC101")).toBeInTheDocument();
    expect(screen.getByText("FIN201")).toBeInTheDocument();
    expect(screen.getByText("$25")).toBeInTheDocument();
    expect(screen.getByText("$51")).toBeInTheDocument();
    // status chips contain the raw status text
    expect(screen.getByText("PLANNED")).toBeInTheDocument();
    expect(screen.getByText("SECURED")).toBeInTheDocument();
  });

  it("shows empty state when no bids; no crash on budget: null", () => {
    seedContext({
      status: "ready",
      toolInput: {},
      toolOutput: { acadTermId: "AY2026/27-T1", budget: null, bids: [] },
    });
    render(<BidPlanView />);
    expect(screen.getByText("No bids planned for this term yet.")).toBeInTheDocument();
    expect(screen.getByText(/No budget set/)).toBeInTheDocument();
  });

  it("renders the post-mutation envelope's unwrapped plan (v1 passthrough case)", () => {
    // Write tools emit { updated, plan }; the adapter unwraps it, so the View
    // receives the plan directly — simulate by feeding the plan as toolOutput.
    const mutationPlan = {
      acadTermId: "AY2026/27-T1",
      budget: { balance: 150 },
      bids: [
        {
          id: "b3",
          bidAmount: 30,
          status: "PLANNED",
          courseCode: "COR-STAT1202",
          courseName: "Stats",
          section: "G2",
          professorName: "Prof Y",
          round: "1",
          window: 2,
        },
      ],
    };
    seedContext({ status: "ready", toolInput: {}, toolOutput: mutationPlan });
    render(<BidPlanView />);
    expect(screen.getByText("COR-STAT1202")).toBeInTheDocument();
    expect(screen.getByText("$30")).toBeInTheDocument();
    expect(screen.getByText(/150/)).toBeInTheDocument();
  });

  it("renders an error alert when the tool fails", () => {
    seedContext({ status: "error", toolInput: {}, error: { message: "boom" } });
    render(<BidPlanView />);
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
  });
});
