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

import BidExplorerView, { viewConfig } from "./view";
import { useDynamicTool, useHostContext, useToolContext, useViewTheme } from "mcp-use/react";

const mockedUseToolContext = vi.mocked(useToolContext);
const mockedUseViewTheme = vi.mocked(useViewTheme);
const mockedUseHostContext = vi.mocked(useHostContext);
const mockedUseDynamicTool = vi.mocked(useDynamicTool);

const history = [
  { acadTermId: "AY2024/25-T1", round: "1", window: 1, min: 10, median: 22, vacancy: 45 },
  { acadTermId: "AY2025/26-T1", round: "1", window: 1, min: 14, median: 28, vacancy: 40 },
];

const fullProps = {
  classId: "cl1",
  history,
  prediction: {
    medianPredicted: 30,
    minPredicted: 18,
    bidWindow: { id: 53, round: "1", window: 1 },
  },
  safetyFactors: [
    { beatsPercentage: 50, multiplier: 1.0 },
    { beatsPercentage: 70, multiplier: 1.05 },
    { beatsPercentage: 90, multiplier: 1.15 },
  ],
};

const historyOnlyProps = {
  classId: null,
  history,
  prediction: null,
  safetyFactors: [],
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

describe("BidExplorerView (v2)", () => {
  it("exports a viewConfig with autoResize and all display modes", () => {
    expect(viewConfig).toEqual({
      autoResize: true,
      displayModes: ["inline", "fullscreen", "pip"],
    });
  });

  it("shows the skeleton while pending (no toolOutput yet)", () => {
    seedContext({ status: "pending", toolInput: {} });
    const { container } = render(<BidExplorerView />);
    expect(container.querySelector("[aria-label='Loading']")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders each history term label and its min/median values", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidExplorerView />);
    expect(screen.getByText("AY2024/25-T1 R1")).toBeInTheDocument();
    expect(screen.getByText("AY2025/26-T1 R1")).toBeInTheDocument();
    expect(screen.getByText("$10–$22")).toBeInTheDocument();
    expect(screen.getByText("$14–$28")).toBeInTheDocument();
  });

  it("renders the prediction marker and defaults the slider to the 70% factor", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidExplorerView />);
    expect(screen.getByText("Predicted")).toBeInTheDocument();
    expect(screen.getByText("Round 1 W1")).toBeInTheDocument();
    expect(screen.getByText(/median \$30/)).toBeInTheDocument(); // predicted median
    const slider = screen.getByRole("slider", { name: "Safety multiplier" });
    expect(slider.getAttribute("value")).toBe("1"); // index of the 70% factor
    expect(screen.getByText(/beats 70% of bids × 1\.05/)).toBeInTheDocument();
    // suggested = round(30 x 1.05 x 100) / 100 = 31.5
    expect(screen.getByText("$31.5")).toBeInTheDocument();
  });

  it("updates the suggested amount and label when the slider moves", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidExplorerView />);
    const slider = screen.getByRole("slider", { name: "Safety multiplier" });
    fireEvent.change(slider, { target: { value: "2" } });
    expect(screen.getByText(/beats 90% of bids × 1\.15/)).toBeInTheDocument();
    // suggested = round(30 x 1.15 x 100) / 100 = 34.5
    expect(screen.getByText("$34.5")).toBeInTheDocument();
  });

  it("renders history without slider or CTA when there is no prediction", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: historyOnlyProps });
    render(<BidExplorerView />);
    expect(screen.getByText("AY2024/25-T1 R1")).toBeInTheDocument();
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.queryByRole("button", { name: /Set bid to/ })).toBeNull();
  });

  it("CTA button carries the current suggested amount only when classId + prediction exist", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidExplorerView />);
    expect(
      screen.getByRole("button", { name: "Set bid to $31.5" }),
    ).toBeInTheDocument();
    const slider = screen.getByRole("slider", { name: "Safety multiplier" });
    fireEvent.change(slider, { target: { value: "2" } });
    expect(
      screen.getByRole("button", { name: "Set bid to $34.5" }),
    ).toBeInTheDocument();
  });

  it("CTA calls upsert-bid with classId, bidAmount AND bidWindowId", async () => {
    const callTool = vi.fn().mockResolvedValue({ structuredContent: {} });
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidExplorerView />);
    fireEvent.click(screen.getByRole("button", { name: "Set bid to $31.5" }));
    await waitFor(() => expect(callTool).toHaveBeenCalledTimes(1));
    expect(callTool).toHaveBeenCalledWith({
      classId: "cl1",
      bidAmount: 31.5,
      bidWindowId: 53,
    });
  });

  it("slider defaults to the 70% factor when toolOutput arrives AFTER mount (no remount)", () => {
    // Real mcp-apps hosts deliver toolOutput asynchronously after
    // ui/initialize without remounting; seed pending then reseed ready and
    // rerender to simulate that arrival on the SAME mounted component.
    const { rerender } = render(<BidExplorerView />);
    seedContext({ status: "pending", toolInput: {} });
    rerender(<BidExplorerView />);
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    rerender(<BidExplorerView />);
    const slider = screen.getByRole("slider", { name: "Safety multiplier" });
    expect(slider.getAttribute("value")).toBe("1"); // index of the 70% factor
    expect(screen.getByText("$31.5")).toBeInTheDocument();
  });

  it("prediction without safety factors falls back to multiplier 1.0 (CTA still shows)", async () => {
    const noFactors = { ...fullProps, safetyFactors: [] };
    const callTool = vi.fn().mockResolvedValue({ structuredContent: {} });
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({ status: "ready", toolInput: {}, toolOutput: noFactors });
    render(<BidExplorerView />);
    // no slider without factors, but the CTA offers the bare median
    expect(screen.queryByRole("slider")).toBeNull();
    const cta = screen.getByRole("button", { name: "Set bid to $30" });
    fireEvent.click(cta);
    await waitFor(() => expect(callTool).toHaveBeenCalledTimes(1));
    expect(callTool).toHaveBeenCalledWith({
      classId: "cl1",
      bidAmount: 30,
      bidWindowId: 53,
    });
  });

  it("does not render the CTA when the host bridge is unavailable", () => {
    mockedUseHostContext.mockReturnValue({ isAvailable: false } as never);
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidExplorerView />);
    expect(screen.queryByRole("button", { name: /Set bid to/ })).toBeNull();
  });

  it("shows Saved feedback after successful upsert-bid", async () => {
    const callTool = vi.fn().mockResolvedValue({ structuredContent: {} });
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidExplorerView />);
    fireEvent.click(screen.getByRole("button", { name: "Set bid to $31.5" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Saved/ })).toBeInTheDocument(),
    );
  });

  it("shows Failed to save when callTool rejects (v2 tool errors reject)", async () => {
    const callTool = vi.fn().mockRejectedValue(new Error("rate limited"));
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidExplorerView />);
    fireEvent.click(screen.getByRole("button", { name: "Set bid to $31.5" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Failed to save/ })).toBeInTheDocument(),
    );
  });

  it("renders an error alert when the tool fails", () => {
    seedContext({ status: "error", toolInput: {}, error: { message: "boom" } });
    render(<BidExplorerView />);
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
  });
});
