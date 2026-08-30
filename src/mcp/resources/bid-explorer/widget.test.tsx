// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import BidExplorer, { widgetMetadata } from "./widget";

/** Feed props to the REAL useWidget hook via mcp-use's URL-params fallback
 *  (active because jsdom is not an iframe -> provider = "mcp-ui"). */
function setMcpParams(toolOutput: unknown, toolInput: unknown = {}) {
  window.history.replaceState(
    null,
    "",
    `/?mcpUseParams=${encodeURIComponent(
      JSON.stringify({ toolInput, toolOutput, toolId: "bid-explorer" }),
    )}`,
  );
}

function renderBidExplorer(toolOutput: unknown) {
  setMcpParams(toolOutput);
  return render(<BidExplorer />);
}

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

describe("bid-explorer widgetMetadata", () => {
  // `WidgetMetadata.props` is typed `z.ZodTypeAny | InputDefinition[] | undefined`;
  // narrow to the Zod schema the widget actually registers.
  const propsSchema = widgetMetadata.props! as z.ZodTypeAny;

  it("parses the full shape the tool's toWidgetProps produces", () => {
    expect(propsSchema.safeParse(fullProps).success).toBe(true);
  });

  it("parses the history-only variant (null classId/prediction, no factors)", () => {
    expect(propsSchema.safeParse(historyOnlyProps).success).toBe(true);
  });
});

describe("bid-explorer widget render", () => {
  it("shows the loading state while pending", () => {
    renderBidExplorer(null);
    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("renders each history term label and its min/median values", () => {
    renderBidExplorer(fullProps);
    expect(screen.getByText("AY2024/25-T1 R1")).toBeTruthy();
    expect(screen.getByText("AY2025/26-T1 R1")).toBeTruthy();
    expect(screen.getByText("$10–$22")).toBeTruthy();
    expect(screen.getByText("$14–$28")).toBeTruthy();
  });

  it("renders the prediction marker and defaults the slider to the 70% factor", () => {
    renderBidExplorer(fullProps);
    expect(screen.getByText("Predicted")).toBeTruthy();
    expect(screen.getByText("Round 1 W1")).toBeTruthy();
    expect(screen.getByText(/median \$30/)).toBeTruthy(); // predicted median
    const slider = screen.getByRole("slider", { name: "Safety multiplier" });
    expect(slider.getAttribute("value")).toBe("1"); // index of the 70% factor
    expect(screen.getByText(/beats 70% of bids × 1\.05/)).toBeTruthy();
    // suggested = round(30 x 1.05 x 100) / 100 = 31.5
    expect(screen.getByText("$31.5")).toBeTruthy();
  });

  it("updates the suggested amount and label when the slider moves", () => {
    renderBidExplorer(fullProps);
    const slider = screen.getByRole("slider", { name: "Safety multiplier" });
    fireEvent.change(slider, { target: { value: "2" } });
    expect(screen.getByText(/beats 90% of bids × 1\.15/)).toBeTruthy();
    // suggested = round(30 x 1.15 x 100) / 100 = 34.5
    expect(screen.getByText("$34.5")).toBeTruthy();
  });

  it("renders history without slider or CTA when there is no prediction", () => {
    renderBidExplorer(historyOnlyProps);
    expect(screen.getByText("AY2024/25-T1 R1")).toBeTruthy();
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.queryByRole("button", { name: /Set bid to/ })).toBeNull();
  });

  it("CTA button carries the current suggested amount only when classId + prediction exist", () => {
    renderBidExplorer(fullProps);
    expect(
      screen.getByRole("button", { name: "Set bid to $31.5" }),
    ).toBeTruthy();
    const slider = screen.getByRole("slider", { name: "Safety multiplier" });
    fireEvent.change(slider, { target: { value: "2" } });
    expect(
      screen.getByRole("button", { name: "Set bid to $34.5" }),
    ).toBeTruthy();
  });
});
