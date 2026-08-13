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
