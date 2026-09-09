/**
 * Chart x-axis label width/clamp helpers.
 *
 * Verbatim logic of `src/modules/bidding/utils/chart-label-layout.ts` (the
 * WEBSITE source of truth) — NOT the view's diverged `* 5.5` copy.
 *
 * Divergence decision (explicit): `views/bid-explorer/view.tsx` used
 * `text.length * 5.5` (9px SVG text) while the website canonical file uses
 * `text.length * 7` (11px/600-weight). Canonical `* 7` wins: it only
 * over-estimates, and over-estimating is safe because clamping only applies
 * near the plot edges. The extracted TrendChart renders 9px labels with this
 * `* 7` width — labels still fit, and no view test asserts exact x values.
 */

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
