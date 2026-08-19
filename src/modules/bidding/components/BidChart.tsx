"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/common/components/chart";
import { inferAcadTerm } from "@/common/functions";
import { formatBidCurrencyCompact } from "@/common/functions/format-bid-currency";
import { Label } from "recharts";
import {
  clampLabelCenterX,
  estimateLabelWidth,
} from "@/modules/bidding/utils/chart-label-layout";

const chartConfig = {
  median: {
    label: "Median Bid",
    color: "#2563eb",
  },
  min: {
    label: "Min Bid",
    color: "#d97706",
  },
} satisfies ChartConfig;

import { compareRounds } from "@/modules/bidding/utils/round-order";
import { parseBidWindowKey } from "@/modules/bidding/utils/bid-window-key";
import {
  computeAcadTermGroups,
} from "@/modules/bidding/utils/acad-term-groups";

export function sortChartData(
  data: (
    | { bidWindow: string; price: [number, number]; size: number }
    | { bidWindow: string; min: number; median: number; size: number }
  )[],
) {
  return [...data]
    .map((d) => {
      const min = "price" in d ? d.price[0] : d.min;
      const median = "price" in d ? d.price[1] : d.median;
      return {
        bidWindow: d.bidWindow,
        price: [min, median] as [number, number],
        min,
        median,
        size: d.size,
      };
    })
    .sort((a, b) => {
      const aKey = parseBidWindowKey(a.bidWindow);
      const bKey = parseBidWindowKey(b.bidWindow);
      // Sort by acadTerm first (asc / chronological), then round order, then window number
      if (aKey.acadTermId !== bKey.acadTermId)
        return aKey.acadTermId.localeCompare(bKey.acadTermId);
      const roundCmp = compareRounds(aKey.round, bKey.round);
      if (roundCmp !== 0) return roundCmp;
      return (parseInt(aKey.window, 10) || 0) - (parseInt(bKey.window, 10) || 0);
    });
}

/** Alternating background colors for AY group shading */
const AY_BG_EVEN = "transparent";
const AY_BG_ODD = "var(--muted)";

/** Chart gutter: plot-area margins and the fixed y-axis gutter. */
const CHART_MARGIN = { top: 24, right: 20, bottom: 5, left: 8 } as const;
const Y_AXIS_WIDTH = 72; // 72 ensures "e$1.2K" / "e$999.00" not clipped (was 50 → "e" half clipped)
const PLOT_LEFT = CHART_MARGIN.left + Y_AXIS_WIDTH; // 80 — used by the x-axis label clamp

interface BidChartProps {
  chartData: {
    bidWindow: string; // "AY202526T1/1/1"
    price: [number, number]; // [min, median]
    size: number;
  }[];
  /** Full bidWindow key of the current active bidding window, e.g. "AY202627T1/1A/2". If omitted or not found in data, no highlight renders. */
  currentWindowBidWindow?: string;
}

export const BidChart = ({
  chartData,
  currentWindowBidWindow,
}: BidChartProps) => {
  const sorted = sortChartData(chartData);
  const manyPoints = sorted.length >= 15;

  // Compute academic year groups for two-tier x-axis and alternating backgrounds
  const ayGroups = useMemo(() => computeAcadTermGroups(sorted), [sorted]);

  // Find the data point matching the current window for the highlight
  const currentPoint = currentWindowBidWindow
    ? sorted.find((d) => d.bidWindow === currentWindowBidWindow)
    : null;

  // Track the chart's rendered width so we can clamp axis labels into the
  // plot area (labels must never overflow the left/right edges).
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Map the MIDDLE bidWindow of each AY group to its short label, so the
  // label renders once per group, centered under the group.
  const groupMidTicks = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of ayGroups) {
      const firstIdx = sorted.findIndex((d) => d.bidWindow === group.firstBidWindow);
      const lastIdx = sorted.findIndex((d) => d.bidWindow === group.lastBidWindow);
      const midIdx = firstIdx + Math.max(0, Math.floor((lastIdx - firstIdx) / 2));
      const midWindow = sorted[midIdx]?.bidWindow;
      if (midWindow) map.set(midWindow, group.shortLabel);
    }
    return map;
  }, [ayGroups, sorted]);

  return (
    <ChartContainer ref={containerRef} config={chartConfig}>
      <LineChart
        accessibilityLayer
        data={sorted}
        margin={CHART_MARGIN}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--border)"
        />

        {/* Alternating academic year background shading */}
        {ayGroups.map((group, i) => (
          <ReferenceArea
            key={group.acadTermId}
            x1={group.firstBidWindow}
            x2={group.lastBidWindow}
            fill={i % 2 === 0 ? AY_BG_EVEN : AY_BG_ODD}
            fillOpacity={i % 2 === 0 ? 0 : 0.4}
          />
        ))}

        <XAxis
          dataKey="bidWindow"
          axisLine={false}
          tickLine={false}
          interval={0}
          tick={(props) => {
            const { x, y, payload } = props as {
              x: number;
              y: number;
              payload: { value: string };
            };
            const label = groupMidTicks.get(payload.value);
            if (!label) return <g />;

            const labelWidth = estimateLabelWidth(label);
            // Plot bounds: left = YAxis width (Y_AXIS_WIDTH) + margin.left;
            // right = measured container width - margin.right.
            const plotLeft = PLOT_LEFT;
            const plotRight =
              containerWidth > 0 ? containerWidth - CHART_MARGIN.right : 0;
            const centerX =
              plotRight > plotLeft
                ? clampLabelCenterX(x, plotLeft, plotRight, labelWidth)
                : x;

            return (
              <text
                x={centerX}
                y={y + 12}
                textAnchor="middle"
                fill="var(--muted-foreground)"
                fontSize={11}
                fontWeight={600}
              >
                {label}
              </text>
            );
          }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => formatBidCurrencyCompact(Number(value))}
          domain={[0, "auto"]}
          width={Y_AXIS_WIDTH}
          tick={{ fontSize: 12 }}
        />

        {/* Current window highlight */}
        {currentPoint && (
          <>
            <ReferenceArea
              x1={currentPoint.bidWindow}
              fill="#2563eb"
              fillOpacity={0.06}
            />
            <ReferenceLine
              x={currentPoint.bidWindow}
              stroke="#64748b"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            >
              <Label
                value="now"
                position="insideTopRight"
                fill="#64748b"
                fontSize={11}
              />
            </ReferenceLine>
          </>
        )}

        {/* Median line — blue solid */}
        <Line
          dataKey="median"
          type="monotone"
          stroke="var(--color-median)"
          strokeWidth={2.5}
          dot={
            manyPoints
              ? false
              : { r: 4, fill: "white", stroke: "var(--color-median)", strokeWidth: 2 }
          }
          activeDot={{ r: 6, fill: "var(--color-median)", stroke: "white", strokeWidth: 2 }}
        />

        {/* Min line — amber dashed */}
        <Line
          dataKey="min"
          type="monotone"
          stroke="var(--color-min)"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={
            manyPoints
              ? false
              : { r: 3, fill: "white", stroke: "var(--color-min)", strokeWidth: 2 }
          }
          activeDot={{ r: 5, fill: "var(--color-min)", stroke: "white", strokeWidth: 2 }}
        />

        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value: string) => {
                const [acadTerm, round, window] = value.split("/");
                const { term, displayYear } = inferAcadTerm(acadTerm!);
                return (
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {displayYear} Term {term}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Round {round} · Window {window}
                    </span>
                  </div>
                );
              }}
              formatter={(value, name) => {
                const item = sorted.find(
                  (d) =>
                    (name === "median" ? d.median : d.min) === value,
                );
                return (
                  <div className="flex w-full items-center justify-between gap-8">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block size-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            name === "median"
                              ? chartConfig.median.color
                              : chartConfig.min.color,
                        }}
                      />
                      <span className="text-muted-foreground capitalize">
                        {name}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-0.5 font-mono font-medium tabular-nums">
                      <span className="text-muted-foreground font-normal text-xs">
                        e$
                      </span>
                      {value as number}
                    </div>
                    {item && (
                      <span className="text-muted-foreground text-xs">
                        {item.size} seat{item.size !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                );
              }}
            />
          }
          cursor={false}
        />

        <Legend
          align="right"
          verticalAlign="top"
          wrapperStyle={{ paddingBottom: 8 }}
        />
      </LineChart>
    </ChartContainer>
  );
};
