import { useMemo, useState } from "react";
import type React from "react";
import type { ViewConfig } from "mcp-use/react";
import { useDynamicTool, useHostContext, useToolContext, useViewTheme } from "mcp-use/react";
import type { BidExplorerData } from "../../src/mcp/view-tools/schemas";
import { useCtaFeedback } from "../shared/use-cta-feedback";
import { TOKENS, Skeleton } from "../shared/tokens";

/**
 * MCP App View (mcp-use v2) for the `explore-bid-options` tool. Must stay
 * dependency-free: no `@/server/*`, no `next/*`.
 *
 * The range bands, safety-multiplier slider and tokens are copied verbatim
 * from the v1 `resources/bid-explorer/widget.tsx`; only the data channels
 * changed:
 *
 *   v1 useWidget().props            -> v2 useToolContext().toolOutput
 *   v1 useWidget().isPending        -> v2 status === "pending"
 *   v1 useWidget().theme            -> v2 useViewTheme()
 *   v1 useWidget().callTool         -> v2 useDynamicTool("upsert-bid")
 *   v1 widgetMetadata export        -> v2 viewConfig export
 *
 * upsert-bid is viewless (not an exported ToolRef), so the v2 escape hatch is
 * useDynamicTool with an explicit contract.
 */

export const viewConfig = {
  autoResize: true,
  displayModes: ["inline", "fullscreen", "pip"],
} satisfies ViewConfig;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * BOSS round ordering — copied from
 * `src/modules/bidding/utils/round-order.ts` (do NOT import: views must stay
 * dependency-free). Unknown rounds sort alphabetically after known rounds.
 */
const ROUND_ORDER: Record<string, number> = {
  "1": 0,
  "1A": 1,
  "1B": 2,
  "1C": 3,
  "1F": 4,
  "2": 5,
  "2A": 6,
};
const KNOWN_ROUND_MAX = Object.keys(ROUND_ORDER).length;
const compareRounds = (a: string, b: string): number => {
  const orderA = ROUND_ORDER[a] ?? KNOWN_ROUND_MAX;
  const orderB = ROUND_ORDER[b] ?? KNOWN_ROUND_MAX;
  if (orderA !== orderB) return orderA - orderB;
  if (orderA === KNOWN_ROUND_MAX) return a.localeCompare(b);
  return 0;
};

type HistoryPoint = NonNullable<BidExplorerData["history"]>[number];
// Structured fields travel with the point: acadTermIds can contain "/" (e.g.
// "AY2024/25-T1"), so splitting the joined key back apart is unreliable.
type ChartPoint = {
  key: string;
  acadTermId: string;
  round: string;
  window: string;
  min: number;
  median: number;
};
const pointKey = (h: Pick<HistoryPoint, "acadTermId" | "round" | "window">) =>
  `${h.acadTermId}/${h.round}/${h.window}`;

/**
 * Grouping mirrors `BidAnalyticsClient.chartData`: group by
 * `acadTermId/round/window`, taking the lowest min/median across duplicates.
 * Sorted chronologically: acadTermId, then BOSS round order, then window.
 */
const buildChartPoints = (history: HistoryPoint[]): ChartPoint[] => {
  const grouped = new Map<string, ChartPoint>();
  for (const h of history) {
    const key = pointKey(h);
    const existing = grouped.get(key);
    if (existing) {
      existing.min = Math.min(existing.min, h.min);
      existing.median = Math.min(existing.median, h.median);
    } else {
      grouped.set(key, {
        key,
        acadTermId: h.acadTermId,
        round: h.round,
        window: String(h.window),
        min: h.min,
        median: h.median,
      });
    }
  }
  return Array.from(grouped.values()).sort((a, b) => {
    if (a.acadTermId !== b.acadTermId) return a.acadTermId.localeCompare(b.acadTermId);
    const roundCmp = compareRounds(a.round, b.round);
    if (roundCmp !== 0) return roundCmp;
    return (parseInt(a.window, 10) || 0) - (parseInt(b.window, 10) || 0);
  });
};

/** Contiguous acadTermId runs for AY-group shading + zebra striping. */
const computeTermGroups = (points: ChartPoint[]): string[][] => {
  const groups: { term: string; keys: string[] }[] = [];
  for (const p of points) {
    const last = groups[groups.length - 1];
    if (last?.term === p.acadTermId) {
      last.keys.push(p.key);
    } else {
      groups.push({ term: p.acadTermId, keys: [p.key] });
    }
  }
  return groups.map((g) => g.keys);
};

/** Inline-SVG min/median trend chart (mirror of `BidChart`, no recharts). */
const TrendChart: React.FC<{
  points: ChartPoint[];
  currentKey: string | null;
  c: (typeof TOKENS)[keyof typeof TOKENS];
}> = ({ points, currentKey, c }) => {
  const W = 560;
  const H = 180;
  const PAD = { top: 12, right: 12, bottom: 24, left: 40 };
  const maxV = Math.max(1, ...points.map((p) => p.median));
  const x = (i: number) =>
    points.length === 1
      ? (W - PAD.left - PAD.right) / 2 + PAD.left
      : PAD.left + (i * (W - PAD.left - PAD.right)) / (points.length - 1);
  const y = (v: number) =>
    PAD.top + (1 - v / maxV) * (H - PAD.top - PAD.bottom);
  const line = (pick: (p: ChartPoint) => number) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(pick(p)).toFixed(1)}`).join(" ");
  const groups = computeTermGroups(points);
  const keyToIdx = new Map(points.map((p, i) => [p.key, i]));
  const plotW = W - PAD.left - PAD.right;
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
            x={firstIdx === 0 ? PAD.left : x(firstIdx) - plotW / Math.max(1, points.length) / 2}
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
      <text x={4} y={y(maxV) + 4} fontSize={10} fill={c.mutedFg}>
        {maxV}
      </text>
      <text x={4} y={y(0) + 4} fontSize={10} fill={c.mutedFg}>
        0
      </text>
      <path d={line((p) => p.median)} data-series="median" fill="none" stroke={c.primary} strokeWidth={2.5} />
      <path
        d={line((p) => p.min)}
        data-series="min"
        fill="none"
        stroke="#d97706"
        strokeWidth={2}
        strokeDasharray="5 3"
      />
      {points.map((p, i) => (
        <g key={p.key}>
          <circle cx={x(i)} cy={y(p.median)} r={4} fill={c.card} stroke={c.primary} strokeWidth={2} />
          <text x={x(i)} y={H - 8} fontSize={9} textAnchor="middle" fill={c.mutedFg}>
            {p.acadTermId}
          </text>
        </g>
      ))}
      {currentKey && keyToIdx.has(currentKey) && (
        <text
          x={x(keyToIdx.get(currentKey)!)}
          y={PAD.top - 2}
          fontSize={10}
          textAnchor="end"
          fill="#64748b"
        >
          now
        </text>
      )}
    </svg>
  );
};

type SortColumn = "term" | "round" | "window" | "min" | "median";
type SortDirection = "asc" | "desc";

const DEFAULT_VISIBLE_ROWS = 10;

/** Sortable history table (mirror of `BidTable`): zebra striping + expand. */
const HistoryTable: React.FC<{
  points: ChartPoint[];
  c: (typeof TOKENS)[keyof typeof TOKENS];
}> = ({ points, c }) => {
  const [showAll, setShowAll] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const groups = useMemo(() => computeTermGroups(points), [points]);
  const groupIdx = useMemo(() => {
    const map = new Map<string, number>();
    groups.forEach((g, gi) => g.forEach((k) => map.set(k, gi)));
    return map;
  }, [groups]);

  const rows = useMemo(() => {
    const base = points.map((p) => ({
      key: p.key,
      term: p.acadTermId,
      round: p.round,
      window: p.window,
      min: p.min,
      median: p.median,
    }));
    if (!sortColumn) return [...base].reverse(); // newest first, like BidTable
    return [...base].sort((a, b) => {
      let cmp: number;
      if (sortColumn === "term") cmp = a.term.localeCompare(b.term);
      else if (sortColumn === "round") cmp = compareRounds(a.round, b.round);
      else if (sortColumn === "window")
        cmp = (parseInt(a.window, 10) || 0) - (parseInt(b.window, 10) || 0);
      else cmp = a[sortColumn] - b[sortColumn];
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [points, sortColumn, sortDirection]);

  const toggle = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };
  const visible = showAll ? rows : rows.slice(0, DEFAULT_VISIBLE_ROWS);
  const th = (label: string, col: SortColumn, numeric = false) => (
    <th
      role="columnheader"
      aria-sort={sortColumn === col ? (sortDirection === "asc" ? "ascending" : "descending") : undefined}
      onClick={() => toggle(col)}
      style={{
        padding: "6px 8px",
        fontWeight: 500,
        fontSize: 12,
        color: c.mutedFg,
        cursor: "pointer",
        userSelect: "none",
        textAlign: numeric ? "right" : "left",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {sortColumn === col ? (sortDirection === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );
  return (
    <div>
      <div style={{ overflowX: "auto", border: `1px solid ${c.border}`, borderRadius: 6 }}>
        <table role="table" style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.border}`, background: `${c.border}66` }}>
              {th("Term", "term")}
              {th("Round", "round")}
              {th("Window", "window")}
              {th("Min (e$)", "min", true)}
              {th("Median (e$)", "median", true)}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.key}
                style={{
                  borderBottom: `1px solid ${c.border}`,
                  background: (groupIdx.get(r.key) ?? 0) % 2 === 1 ? `${c.border}55` : "transparent",
                }}
              >
                <td style={{ padding: "6px 8px" }}>{r.term}</td>
                <td style={{ padding: "6px 8px" }}>{r.round}</td>
                <td style={{ padding: "6px 8px" }}>{r.window}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "var(--font-geist-mono, ui-monospace)" }}>{r.min}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "var(--font-geist-mono, ui-monospace)" }}>{r.median}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > DEFAULT_VISIBLE_ROWS && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          style={{
            marginTop: 8,
            fontSize: 12,
            fontWeight: 600,
            color: c.primary,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {showAll ? "Show less" : `Show all ${rows.length} rows`}
        </button>
      )}
    </div>
  );
};

/** Plain-button toggle (mirror of `TagToggleGroup` tag behavior). */
const ToggleButton: React.FC<{
  label: string;
  pressed: boolean;
  onClick: () => void;
  c: (typeof TOKENS)[keyof typeof TOKENS];
}> = ({ label, pressed, onClick, c }) => (
  <button
    type="button"
    aria-pressed={pressed}
    onClick={onClick}
    style={{
      fontSize: 12,
      fontWeight: pressed ? 600 : 400,
      padding: "2px 10px",
      borderRadius: 9999,
      cursor: "pointer",
      border: `1px solid ${pressed ? c.primary : c.border}`,
      background: pressed ? `${c.primary}1A` : "transparent",
      color: pressed ? c.primary : c.cardFg,
    }}
  >
    {label}
  </button>
);

/** One labelled track with a min–median range band and a median tick. */
const RangeRow: React.FC<{
  label: string;
  min: number;
  median: number;
  max: number;
  dashed?: boolean;
  c: (typeof TOKENS)[keyof typeof TOKENS];
}> = ({ label, min, median, max, dashed, c }) => {
  const pct = (v: number) => Math.min(100, (v / max) * 100);
  const left = pct(min);
  const width = Math.max(1, pct(median) - left);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 110,
          flexShrink: 0,
          fontSize: 12,
          color: c.mutedFg,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 18,
          position: "relative",
          background: c.border,
          borderRadius: 4,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${left}%`,
            width: `${width}%`,
            top: 0,
            bottom: 0,
            borderRadius: 4,
            background: dashed ? "transparent" : `${c.primary}4D`, // 30% opacity
            border: dashed ? `2px dashed ${c.primary}` : "none",
            boxSizing: "border-box",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${pct(median)}%`,
            top: 0,
            bottom: 0,
            width: 2,
            background: c.primary,
          }}
        />
      </div>
      <span
        style={{
          flexShrink: 0,
          fontFamily: "var(--font-geist-mono, ui-monospace)",
          fontSize: 12,
          textAlign: "right",
        }}
      >
        ${min}–${median}
      </span>
    </div>
  );
};

const BidExplorerView: React.FC = () => {
  // Defensive: the host always provides context, but a missing context must
  // render the skeleton, never crash the view on destructure.
  const { status, toolOutput, error } = useToolContext<"explore-bid-options">() ?? {
    status: "pending" as const,
  };
  const theme = useViewTheme();
  // The slider's selected factor starts unset: toolOutput arrives
  // asynchronously in the real mcp-apps host (after ui/initialize) WITHOUT a
  // remount, so an initializer reading toolOutput would freeze the wrong
  // default. The default (70% factor, else middle) is resolved at render
  // time instead.
  const [factorIdx, setFactorIdx] = useState<number | null>(null);
  const [selectedRounds, setSelectedRounds] = useState<string[]>([]);
  const [selectedWindows, setSelectedWindows] = useState<string[]>([]);
  const { feedback, showFeedback } = useCtaFeedback();
  // upsert-bid is viewless — useDynamicTool carries the explicit contract.
  const upsertBid = useDynamicTool<{
    classId: string;
    bidAmount: number;
    bidWindowId: number;
  }>("upsert-bid");
  const { isAvailable } = useHostContext();

  const dark = theme === "dark";
  const c = dark ? TOKENS.dark : TOKENS.light;
  // `toolOutput` is {classId, history, prediction, safetyFactors} from the
  // tool's outputSchema. The tool adapter currently passes its schemas
  // `as never` (Task 9 candidate to tighten), so read defensively exactly
  // like the v1 widget read `props`.
  const props = toolOutput as BidExplorerData | undefined;
  // Memoize so downstream useMemo deps stay referentially stable across
  // renders when toolOutput is absent (avoids a fresh [] each render).
  const history = useMemo(() => props?.history ?? [], [props?.history]);
  const prediction = props?.prediction ?? null;
  const safetyFactors = props?.safetyFactors ?? [];
  const classId = props?.classId ?? null;
  const isEmpty = history.length === 0 && !prediction;

  const defaultIdx = () => {
    const i = safetyFactors.findIndex((f) => f.beatsPercentage === 70);
    return i >= 0 ? i : Math.floor(Math.max(0, safetyFactors.length - 1) / 2);
  };
  const idx = Math.min(
    factorIdx ?? defaultIdx(),
    Math.max(0, safetyFactors.length - 1),
  );
  const factor = safetyFactors[idx];
  // No safety factors for this term -> multiplier 1.0, like recommend.ts
  // (`factor?.multiplier ?? 1`); the CTA must still be offered.
  const multiplier = factor?.multiplier ?? 1;
  const suggested = prediction
    ? round2(prediction.medianPredicted * multiplier)
    : null;

  // Data-driven filters mirror `BidAnalyticsClient`: options come from the
  // history itself, with bidirectional round<->window availability and
  // auto-deselection of options that stop being valid. These hooks run
  // unconditionally (even for pending/error/empty states) to preserve hook
  // order; they simply compute over empty arrays when there is no history.
  const allPoints = useMemo(() => buildChartPoints(history), [history]);
  const { dataRounds, dataWindows, roundWindows, windowRounds } = useMemo(() => {
    const rounds = new Set<string>();
    const windows = new Set<string>();
    const rw = new Map<string, Set<number>>();
    const wr = new Map<number, Set<string>>();
    for (const h of history) {
      rounds.add(h.round);
      windows.add(String(h.window));
      if (!rw.has(h.round)) rw.set(h.round, new Set());
      rw.get(h.round)!.add(h.window);
      if (!wr.has(h.window)) wr.set(h.window, new Set());
      wr.get(h.window)!.add(h.round);
    }
    return {
      dataRounds: Array.from(rounds).sort(compareRounds),
      dataWindows: Array.from(windows).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)),
      roundWindows: rw,
      windowRounds: wr,
    };
  }, [history]);
  const { availableRounds, availableWindows } = useMemo(() => {
    let availRounds: string[];
    if (selectedWindows.length > 0) {
      const set = new Set<string>();
      for (const w of selectedWindows)
        windowRounds.get(parseInt(w, 10))?.forEach((r) => set.add(r));
      availRounds = dataRounds.filter((r) => set.has(r));
    } else {
      availRounds = dataRounds;
    }
    let availWindows: string[];
    if (selectedRounds.length > 0) {
      const set = new Set<number>();
      for (const r of selectedRounds)
        roundWindows.get(r)?.forEach((w) => set.add(w));
      availWindows = dataWindows.filter((w) => set.has(parseInt(w, 10)));
    } else {
      availWindows = dataWindows;
    }
    return { availableRounds: availRounds, availableWindows: availWindows };
  }, [selectedRounds, selectedWindows, dataRounds, dataWindows, roundWindows, windowRounds]);
  const filteredPoints = useMemo(
    () =>
      allPoints.filter((p) => {
        if (selectedRounds.length > 0 && !selectedRounds.includes(p.round)) return false;
        if (selectedWindows.length > 0 && !selectedWindows.includes(p.window)) return false;
        return true;
      }),
    [allPoints, selectedRounds, selectedWindows],
  );
  const toggleRound = (round: string) => {
    const next = selectedRounds.includes(round)
      ? selectedRounds.filter((r) => r !== round)
      : [...selectedRounds, round];
    setSelectedRounds(next);
    // Deselecting the last round clears the round filter: leave the window
    // selection untouched instead of wiping it via an empty valid set.
    if (next.length === 0) return;
    const valid = new Set<number>();
    for (const r of next) roundWindows.get(r)?.forEach((w) => valid.add(w));
    setSelectedWindows((prev) => prev.filter((w) => valid.has(parseInt(w, 10))));
  };
  const toggleWindow = (window: string) => {
    const next = selectedWindows.includes(window)
      ? selectedWindows.filter((w) => w !== window)
      : [...selectedWindows, window];
    setSelectedWindows(next);
    // Same guard as toggleRound: clearing the window filter must not wipe
    // the round selection.
    if (next.length === 0) return;
    const valid = new Set<string>();
    for (const w of next) windowRounds.get(parseInt(w, 10))?.forEach((r) => valid.add(r));
    setSelectedRounds((prev) => prev.filter((r) => valid.has(r)));
  };
  const currentKey = prediction
    ? allPoints.find(
        (p) =>
          p.round === prediction.bidWindow.round &&
          p.window === String(prediction.bidWindow.window),
      )?.key ?? null
    : null;

  const max = Math.max(
    1,
    ...history.map((h) => h.median),
    ...(prediction ? [prediction.medianPredicted] : []),
  );

  // State returns AFTER every hook above: pending/error/empty must not
  // return before the useMemo block, or hook order changes when toolOutput
  // arrives after mount (pending -> ready without remount).
  if (status === "pending") return <Skeleton dark={dark} />;
  if (status === "error") {
    return (
      <div
        role="alert"
        style={{
          fontFamily: "var(--font-inter, ui-sans-serif, system-ui)",
          color: c.cardFg,
          background: c.card,
          border: `1px solid ${c.border}`,
          borderRadius: c.radius,
          padding: 16,
        }}
      >
        {error.message}
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div
        style={{
          fontFamily: "var(--font-inter, ui-sans-serif, system-ui)",
          color: c.mutedFg,
          background: c.card,
          border: `1px solid ${c.border}`,
          borderRadius: c.radius,
          padding: 16,
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        No bid history for this combination.
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "var(--font-inter, ui-sans-serif, system-ui)",
        color: c.cardFg,
        background: c.card,
        border: `1px solid ${c.border}`,
        borderRadius: c.radius,
        padding: 16,
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "100%",
      }}
    >
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            fontFamily: "var(--font-geist-mono, ui-monospace)",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {classId ?? "Bid explorer"}
        </span>
        {prediction && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 9999,
              background: dark
                ? "oklch(0.488 0.243 264.376 / 15%)"
                : "oklch(0.546 0.245 262.881 / 12%)",
              color: dark ? "oklch(0.623 0.214 259.815)" : "oklch(0.488 0.243 264.376)",
              border: `1px solid ${c.border}`,
            }}
          >
            {`Round ${prediction.bidWindow.round} W${prediction.bidWindow.window}`}
          </span>
        )}
      </div>
      {/* Historical trend chart */}
      {filteredPoints.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Historical Bidding Trend
          </div>
          <TrendChart points={filteredPoints} currentKey={currentKey} c={c} />
        </div>
      )}
      {/* Round / window filters (data-driven, bidirectional) */}
      {dataRounds.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: c.mutedFg, marginBottom: 4 }}>
            Round
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {availableRounds.map((r) => (
              <ToggleButton
                key={r}
                label={r}
                pressed={selectedRounds.includes(r)}
                onClick={() => toggleRound(r)}
                c={c}
              />
            ))}
          </div>
        </div>
      )}
      {dataWindows.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: c.mutedFg, marginBottom: 4 }}>
            Window
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {availableWindows.map((w) => (
              <ToggleButton
                key={w}
                label={`W${w}`}
                pressed={selectedWindows.includes(w)}
                onClick={() => toggleWindow(w)}
                c={c}
              />
            ))}
          </div>
        </div>
      )}
      {/* Sortable history table */}
      {filteredPoints.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <HistoryTable points={filteredPoints} c={c} />
        </div>
      ) : (
        <div style={{ fontSize: 12, color: c.mutedFg, textAlign: "center", marginTop: 12 }}>
          No bid data available for the selected filters.
        </div>
      )}
      {/* History bands */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
        {prediction && (
          <div>
            <div style={{ fontSize: 11, color: c.mutedFg, fontWeight: 500, marginBottom: 2 }}>
              Predicted · median ${prediction.medianPredicted}
            </div>
            <RangeRow
              label="Predicted"
              min={prediction.minPredicted ?? prediction.medianPredicted}
              median={prediction.medianPredicted}
              max={max}
              dashed
              c={c}
            />
          </div>
        )}
      </div>
      {/* Safety-multiplier slider */}
      {prediction && safetyFactors.length > 0 && factor && suggested !== null && (
        <div style={{ marginTop: 16 }}>
          <input
            type="range"
            aria-label="Safety multiplier"
            min={0}
            max={safetyFactors.length - 1}
            step={1}
            value={idx}
            onChange={(e) => setFactorIdx(Number(e.target.value))}
            style={{ width: "100%", accentColor: c.primary }}
          />
          <div style={{ fontSize: 12, color: c.mutedFg, marginTop: 4 }}>
            beats {factor.beatsPercentage}% of bids × {factor.multiplier}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: c.primary, marginTop: 4 }}>
            ${suggested}
          </div>
        </div>
      )}
      {/* CTA */}
      {isAvailable && classId && prediction && suggested !== null && (
        <button
          type="button"
          aria-live="polite"
          onClick={() => {
            // classId truthy above — narrow to string for the call contract.
            const cid: string = classId;
            const bidWindowId = prediction.bidWindow.id;
            // v2: tool errors reject (ToolError) instead of resolving
            // isError:true, so "Failed to save" moves to catch.
            upsertBid
              .callTool({ classId: cid, bidAmount: suggested, bidWindowId })
              .then(() => showFeedback("saved"))
              .catch(() => showFeedback("error"));
          }}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "8px 16px",
            borderRadius: 9999,
            border: "none",
            background: feedback === "error" ? "oklch(0.6 0.2 20)" : c.primary,
            color: c.primaryFg,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {feedback === "saved"
            ? "Saved \u2713"
            : feedback === "error"
              ? "Failed to save"
              : `Set bid to $${suggested}`}
        </button>
      )}
    </div>
  );
};

export default BidExplorerView;
