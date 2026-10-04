/**
 * Approximate rendered width (px) of an 11px/600-weight SVG <text> label.
 * Used to clamp x-axis labels inside the plot; a small over-estimate is
 * fine because we only clamp near the edges.
 */
export function estimateLabelWidth(text: string): number {
  return Math.max(40, text.length * 7);
}

/**
 * Clamp a label's desired center X so the whole label stays inside the plot
 * area. plotLeft = right edge of the YAxis; plotRight = container width minus
 * the chart's right margin. When the plot is too narrow for the label, fall
 * back to the plot center.
 */
export function clampLabelCenterX(
  centerX: number,
  plotLeft: number,
  plotRight: number,
  labelWidth: number,
): number {
  const minX = plotLeft + labelWidth / 2;
  const maxX = plotRight - labelWidth / 2;
  if (maxX < minX) return (plotLeft + plotRight) / 2;
  return Math.max(minX, Math.min(maxX, centerX));
}

export interface GroupTickInfo {
  tickValue: number;
  label: string;
  groupIndex: number;
}

export interface GroupTickLayout extends GroupTickInfo {
  row: number;
  yOffset: number;
  visible: boolean;
}

/**
 * Stagger group labels into 2 rows when ticks.length > 2 (even group index on
 * row 0 at y + 10, odd group index on row 1 at y + 24), and prevent collisions
 * per row using estimateLabelWidth and containerWidth so labels never overlap horizontally.
 */
export function computeGroupTickLayout(
  ticks: GroupTickInfo[],
  totalPoints: number,
  containerWidth: number,
  plotLeft = 80,
  plotRightMargin = 20,
): Map<number, GroupTickLayout> {
  const map = new Map<number, GroupTickLayout>();
  const stagger = ticks.length > 2;
  const plotRight = containerWidth > 0 ? containerWidth - plotRightMargin : 0;
  const canCheckCollision = plotRight > plotLeft && totalPoints > 0;

  const lastRightEdgePerRow = new Map<number, number>();

  for (const item of ticks) {
    const row = stagger ? (item.groupIndex % 2 === 0 ? 0 : 1) : 0;
    const yOffset = stagger ? (item.groupIndex % 2 === 0 ? 10 : 24) : 12;

    let visible = true;
    if (canCheckCollision) {
      const nominalX =
        plotLeft +
        ((item.tickValue + 0.5) / totalPoints) * (plotRight - plotLeft);
      const labelWidth = estimateLabelWidth(item.label);
      const centerX = clampLabelCenterX(
        nominalX,
        plotLeft,
        plotRight,
        labelWidth,
      );
      const leftEdge = centerX - labelWidth / 2;
      const rightEdge = centerX + labelWidth / 2;

      const lastRight = lastRightEdgePerRow.get(row) ?? -Infinity;
      if (leftEdge < lastRight) {
        visible = false;
      } else {
        lastRightEdgePerRow.set(row, rightEdge);
      }
    }

    map.set(item.tickValue, {
      ...item,
      row,
      yOffset,
      visible,
    });
  }

  return map;
}

