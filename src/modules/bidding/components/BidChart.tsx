"use client";

import { useMemo } from "react";
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
import { Label } from "recharts";

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

import { ROUND_ORDER } from "@/modules/bidding/utils/round-order";

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
      const [termA, roundA, winA] = a.bidWindow.split("/");
      const [termB, roundB, winB] = b.bidWindow.split("/");
      // Sort by acadTerm first (asc / chronological), then round order, then window number
      if (termA !== termB)
        return (termA ?? "").localeCompare(termB ?? "");
      const roA = ROUND_ORDER[(roundA ?? "").trim()] ?? 99;
      const roB = ROUND_ORDER[(roundB ?? "").trim()] ?? 99;
      if (roA !== roB) return roA - roB;
      // Both unknown → stable lexicographic fallback
      if (roA === 99 && roB === 99)
        return (roundA ?? "").localeCompare(roundB ?? "");
      return (parseInt(winA ?? "0") || 0) - (parseInt(winB ?? "0") || 0);
    });
}

/** Academic year group computed from sorted chart data */
interface AYGroup {
  acadTermId: string;
  shortLabel: string;
  firstBidWindow: string;
  lastBidWindow: string;
}

/**
 * Compute contiguous academic year groups from sorted data.
 * Each group represents a contiguous run of data points with the same acadTermId.
 */
function computeAYGroups(
  sorted: ReturnType<typeof sortChartData>,
): AYGroup[] {
  const groups: AYGroup[] = [];
  let current: AYGroup | null = null;

  for (const point of sorted) {
    const [acadTermId] = point.bidWindow.split("/");
    if (!acadTermId) continue;

    if (!current || current.acadTermId !== acadTermId) {
      const { shortLabel } = inferAcadTerm(acadTermId);
      current = {
        acadTermId,
        shortLabel,
        firstBidWindow: point.bidWindow,
        lastBidWindow: point.bidWindow,
      };
      groups.push(current);
    } else {
      current.lastBidWindow = point.bidWindow;
    }
  }

  return groups;
}

/** Alternating background colors for AY group shading */
const AY_BG_EVEN = "transparent";
const AY_BG_ODD = "var(--muted)";

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
  const ayGroups = useMemo(() => computeAYGroups(sorted), [sorted]);

  // Find the data point matching the current window for the highlight
  const currentPoint = currentWindowBidWindow
    ? sorted.find((d) => d.bidWindow === currentWindowBidWindow)
    : null;

  return (
    <ChartContainer config={chartConfig}>
      <LineChart
        accessibilityLayer
        data={sorted}
        margin={{ top: 24, right: 20, bottom: 5, left: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--border)"
        />

        {/* Alternating academic year background shading + AY labels */}
        {ayGroups.map((group, i) => (
          <ReferenceArea
            key={group.acadTermId}
            x1={group.firstBidWindow}
            x2={group.lastBidWindow}
            fill={i % 2 === 0 ? AY_BG_EVEN : AY_BG_ODD}
            fillOpacity={i % 2 === 0 ? 0 : 0.4}
            // AY label at the bottom of each group — acts as the x-axis label
            label={{
              value: group.shortLabel,
              position: "insideBottom",
              fill: "var(--muted-foreground)",
              fontSize: 11,
              fontWeight: 600,
              offset: 4,
            }}
          />
        ))}

        <XAxis
          dataKey="bidWindow"
          tick={false}
          axisLine={false}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `e$${value}`}
          domain={[0, "auto"]}
          width={50}
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
