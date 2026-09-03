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

import BidRecommendationView, { viewConfig } from "./view";
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

const fullProps = {
  classId: "cl1",
  acadTermId: "t1",
  bidWindow: { id: 53, round: "1", window: 1 },
  predictedMedian: 25,
  suggestedBidAmount: 26.25,
  multiplierUsed: { beatsPercentage: 70, multiplier: 1.05 },
  rationale:
    "Predicted median 25 x safety multiplier 1.05 (beats 70% of bids).",
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

describe("BidRecommendationView (v2)", () => {
  it("exports a viewConfig with autoResize and all display modes", () => {
    expect(viewConfig).toEqual({
      autoResize: true,
      displayModes: ["inline", "fullscreen", "pip"],
    });
  });

  it("shows the skeleton while pending (no toolOutput yet)", () => {
    seedContext({ status: "pending", toolInput: {} });
    const { container } = render(<BidRecommendationView />);
    expect(container.querySelector("[aria-label='Loading']")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders the class id and suggested bid amount", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidRecommendationView />);
    expect(screen.getByText("cl1")).toBeInTheDocument();
    expect(screen.getByText("$26.25")).toBeInTheDocument();
  });

  it("renders the predicted median, multiplier and rationale when present", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidRecommendationView />);
    expect(screen.getByText("$25")).toBeInTheDocument();
    expect(screen.getAllByText(/1\.05/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/beats 70%/).length).toBeGreaterThan(0);
    expect(screen.getByText(/safety multiplier 1.05/)).toBeInTheDocument();
  });

  it("omits optional rows when absent", () => {
    seedContext({
      status: "ready",
      toolInput: {},
      toolOutput: {
        classId: "cl2",
        acadTermId: "t1",
        suggestedBidAmount: 20,
      },
    });
    render(<BidRecommendationView />);
    expect(screen.queryByText(/Predicted median/)).toBeNull();
    expect(screen.queryByText(/×/)).toBeNull();
  });

  it("renders the Set bid CTA when a bidWindow is present (v1 parity)", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidRecommendationView />);
    expect(
      screen.getByRole("button", { name: "Set bid to $26.25" }),
    ).toBeInTheDocument();
  });

  it("renders no CTA without a bidWindow (upsert-bid needs bidWindowId)", () => {
    const noWindow = { ...fullProps, bidWindow: undefined };
    seedContext({ status: "ready", toolInput: {}, toolOutput: noWindow });
    render(<BidRecommendationView />);
    expect(screen.queryByRole("button", { name: /Set bid to/ })).toBeNull();
  });

  it("renders no CTA when the host bridge is unavailable", () => {
    mockedUseHostContext.mockReturnValue({ isAvailable: false } as never);
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidRecommendationView />);
    expect(screen.queryByRole("button", { name: /Set bid to/ })).toBeNull();
  });

  it("CTA calls upsert-bid with classId, bidAmount AND bidWindowId", async () => {
    const callTool = vi.fn().mockResolvedValue({ structuredContent: {} });
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidRecommendationView />);
    fireEvent.click(screen.getByRole("button", { name: "Set bid to $26.25" }));
    await waitFor(() => expect(callTool).toHaveBeenCalledTimes(1));
    expect(callTool).toHaveBeenCalledWith({
      classId: "cl1",
      bidAmount: 26.25,
      bidWindowId: 53,
    });
  });

  it("shows Saved feedback after successful upsert-bid", async () => {
    const callTool = vi.fn().mockResolvedValue({ structuredContent: {} });
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidRecommendationView />);
    fireEvent.click(screen.getByRole("button", { name: "Set bid to $26.25" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Saved/ })).toBeInTheDocument(),
    );
  });

  it("shows Failed to save when callTool rejects (v2 tool errors reject)", async () => {
    const callTool = vi.fn().mockRejectedValue(new Error("rate limited"));
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidRecommendationView />);
    fireEvent.click(screen.getByRole("button", { name: "Set bid to $26.25" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Failed to save/ }),
      ).toBeInTheDocument(),
    );
  });

  it("renders an error alert when the tool fails", () => {
    seedContext({ status: "error", toolInput: {}, error: { message: "boom" } });
    render(<BidRecommendationView />);
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
  });
});
