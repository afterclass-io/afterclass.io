import { describe, expect, it } from "vitest";
import { clampLabelCenterX, estimateLabelWidth } from "./chart-label-layout";

describe("clampLabelCenterX", () => {
  const plotLeft = 50; // YAxis width
  const plotRight = 780; // container width - right margin

  it("keeps a left-edge label inside the plot", () => {
    // 70px label at the left edge → center must be ≥ 50 + 35 = 85
    expect(clampLabelCenterX(50, plotLeft, plotRight, 70)).toBe(85);
  });

  it("keeps a right-edge label inside the plot", () => {
    // 70px label at the right edge → center must be ≤ 780 - 35 = 745
    expect(clampLabelCenterX(780, plotLeft, plotRight, 70)).toBe(745);
  });

  it("leaves a comfortably-centered label untouched", () => {
    expect(clampLabelCenterX(400, plotLeft, plotRight, 70)).toBe(400);
  });

  it("centers when the plot is too narrow for the label", () => {
    // plot 50..120 with a 70px label → no valid position, center it
    expect(clampLabelCenterX(100, 50, 120, 70)).toBe(85);
  });
});

describe("estimateLabelWidth", () => {
  it("estimates wider labels for longer text, with a floor", () => {
    expect(estimateLabelWidth("25-26 T1")).toBeGreaterThanOrEqual(40);
    expect(estimateLabelWidth("25-26 T1")).toBeLessThan(
      estimateLabelWidth("25-26 T3B"),
    );
  });
});
