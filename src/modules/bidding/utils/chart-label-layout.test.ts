import { describe, expect, it } from "vitest";
import {
  clampLabelCenterX,
  computeGroupTickLayout,
  estimateLabelWidth,
} from "./chart-label-layout";

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

describe("computeGroupTickLayout", () => {
  it("staggers into 2 rows when ticks.length > 2 (even at y+10, odd at y+24)", () => {
    const ticks = [
      { tickValue: 0, label: "23-24 T1", groupIndex: 0 },
      { tickValue: 2, label: "24-25 T1", groupIndex: 1 },
      { tickValue: 4, label: "25-26 T1", groupIndex: 2 },
    ];
    const layout = computeGroupTickLayout(ticks, 6, 800);

    expect(layout.get(0)).toMatchObject({ row: 0, yOffset: 10, visible: true });
    expect(layout.get(2)).toMatchObject({ row: 1, yOffset: 24, visible: true });
    expect(layout.get(4)).toMatchObject({ row: 0, yOffset: 10, visible: true });
  });

  it("does not stagger when ticks.length <= 2", () => {
    const ticks = [
      { tickValue: 0, label: "25-26 T1", groupIndex: 0 },
      { tickValue: 2, label: "26-27 T1", groupIndex: 1 },
    ];
    const layout = computeGroupTickLayout(ticks, 4, 800);

    expect(layout.get(0)).toMatchObject({ row: 0, yOffset: 12, visible: true });
    expect(layout.get(2)).toMatchObject({ row: 0, yOffset: 12, visible: true });
  });

  it("prevents collisions per row on narrow containers", () => {
    // 4 groups, total 4 points in a very narrow 180px container
    // Row 0 has group 0 (tick 0) and group 2 (tick 2)
    // Row 1 has group 1 (tick 1) and group 3 (tick 3)
    const ticks = [
      { tickValue: 0, label: "23-24 T1", groupIndex: 0 },
      { tickValue: 1, label: "24-25 T1", groupIndex: 1 },
      { tickValue: 2, label: "25-26 T1", groupIndex: 2 },
      { tickValue: 3, label: "26-27 T1", groupIndex: 3 },
    ];
    // Container width 180: plotLeft 80, plotRight 160 -> width 80px
    // Label width for 8 chars is 56px.
    const layout = computeGroupTickLayout(ticks, 4, 180);

    expect(layout.get(0)?.visible).toBe(true);
    expect(layout.get(1)?.visible).toBe(true);
    // Group 2 collides with group 0 on row 0
    expect(layout.get(2)?.visible).toBe(false);
    // Group 3 collides with group 1 on row 1
    expect(layout.get(3)?.visible).toBe(false);
  });

  it("keeps all labels visible when containerWidth is unmeasured (<= 0)", () => {
    const ticks = [
      { tickValue: 0, label: "23-24 T1", groupIndex: 0 },
      { tickValue: 1, label: "24-25 T1", groupIndex: 1 },
      { tickValue: 2, label: "25-26 T1", groupIndex: 2 },
    ];
    const layout = computeGroupTickLayout(ticks, 3, 0);

    expect(layout.get(0)?.visible).toBe(true);
    expect(layout.get(1)?.visible).toBe(true);
    expect(layout.get(2)?.visible).toBe(true);
  });
});

