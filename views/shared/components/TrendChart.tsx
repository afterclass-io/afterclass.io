import type React from "react";
import type { ThemeColors } from "../tokens";
import {
  clampLabelCenterX,
  estimateLabelWidth,
} from "../utils/chart-label-layout";
import { shortTermLabel } from "../utils/term-label";
import { computeTermGroups, type ChartPoint } from "../utils/chart-points";

/**
 * Inline-SVG min/median trend chart (extracted verbatim from
 * `views/bid-explorer/view.tsx`, mirror of the website `BidChart`, no
 * recharts). Host-agnostic: points + theme via props.
 *
 * Uses shared `chart-points.ts` (grouping/`computeTermGroups`) +
 * `chart-label-layout.ts` (canonical `*7` widths — see that file's
 * divergence note) + `term-label.ts`.
 */
export const TrendChart: React.FC<{
  points: ChartPoint[];
  currentKey: string | null;
  c: ThemeColors;
}> = ({ points, currentKey, c }) => {
  const W = 560;
  const H = 196;
  // Ported from `BidChart`'s gutter thinking (CHART_MARGIN +
  // Y_AXIS_WIDTH): the y-axis gutter must fit the widest tick
  // ("999" at 10px) and the last x-label must not run past the
  // viewBox edge.
  const PAD = { top: 16, right: 28, bottom: 40, left: 48 };
  const maxV = Math.max(1, ...points.map((p) => p.median));
  const x = (i: number) =>
    points.length === 1
      ? (W - PAD.left - PAD.right) / 2 + PAD.left
      : PAD.left + (i * (W - PAD.left - PAD.right)) / (points.length - 1);
  const y = (v: number) =>
    PAD.top + (1 - v / maxV) * (H - PAD.top - PAD.bottom);
  const line = (pick: (p: ChartPoint) => number) =>
    points
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(pick(p)).toFixed(1)}`,
      )
      .join(" ");
  const groups = computeTermGroups(points);
  const keyToIdx = new Map(points.map((p, i) => [p.key, i]));
  const plotW = W - PAD.left - PAD.right;
  const plotRight = W - PAD.right;
  const maxLabel = String(maxV);
  const stagger = points.length > 2;
  // Clamp an x-label's center so the whole label stays inside the plot area.
  const clampCenterX = (centerX: number, labelWidth: number): number =>
    clampLabelCenterX(centerX, PAD.left, plotRight, labelWidth);
  // "now" marker: offset left of the line so it never collides
  // with a max-value x-label at the same position.
  const nowIdx = currentKey ? (keyToIdx.get(currentKey) ?? null) : null;
  const nowX = nowIdx !== null ? x(nowIdx) : 0;
  const nowAtRightEdge = nowIdx !== null && nowX >= plotRight - 16;
  return (
    <svg
      role="img"
      aria-label="Bid trend chart"
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      {groups.map((g, gi) => {
        const firstIdx = keyToIdx.get(g[0] ?? "");
        if (gi % 2 !== 1 || firstIdx === undefined) return null;
        return (
          <rect
            key={g[0]}
            x={
              firstIdx === 0
                ? PAD.left
                : x(firstIdx) - plotW / Math.max(1, points.length) / 2
            }
            y={PAD.top}
            width={(g.length * plotW) / Math.max(1, points.length)}
            height={H - PAD.top - PAD.bottom}
            fill={c.border}
            opacity={0.4}
          />
        );
      })}
      {currentKey && keyToIdx.has(currentKey) && (
        <line
          x1={x(keyToIdx.get(currentKey)!)}
          x2={x(keyToIdx.get(currentKey)!)}
          y1={PAD.top}
          y2={H - PAD.bottom}
          stroke="#64748b"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
      )}
      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={y(0)}
        y2={y(0)}
        stroke={c.border}
      />
      <text
        x={PAD.left - 6}
        y={y(maxV) + 4}
        fontSize={10}
        textAnchor="end"
        fill={c.mutedFg}
      >
        {maxLabel}
      </text>
      <text
        x={PAD.left - 6}
        y={y(0) + 4}
        fontSize={10}
        textAnchor="end"
        fill={c.mutedFg}
      >
        0
      </text>
      <path
        d={line((p) => p.median)}
        data-series="median"
        fill="none"
        stroke={c.primary}
        strokeWidth={2.5}
      />
      <path
        d={line((p) => p.min)}
        data-series="min"
        fill="none"
        stroke="#d97706"
        strokeWidth={2}
        strokeDasharray="5 3"
      />
      {points.map((p, i) => {
        const label = shortTermLabel(p.acadTermId);
        const cx = clampCenterX(x(i), estimateLabelWidth(label));
        const ly = stagger && i % 2 === 1 ? H - 8 : H - 22;
        return (
          <g key={p.key}>
            <circle
              cx={x(i)}
              cy={y(p.median)}
              r={4}
              fill={c.card}
              stroke={c.primary}
              strokeWidth={2}
            />
            <text
              x={cx}
              y={ly}
              fontSize={9}
              textAnchor="middle"
              fill={c.mutedFg}
            >
              {label}
            </text>
          </g>
        );
      })}
      {nowIdx !== null && (
        <text
          x={nowX}
          y={PAD.top - 4}
          fontSize={9}
          textAnchor={nowAtRightEdge ? "end" : "start"}
          dx={nowAtRightEdge ? -4 : 4}
          fill="#64748b"
        >
          now
        </text>
      )}
    </svg>
  );
};
