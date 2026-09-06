import { useMemo, useState } from "react";
import type React from "react";
import type { ThemeColors } from "../tokens";
import { compareRounds } from "../utils/round-order";
import { computeTermGroups, type ChartPoint } from "../utils/chart-points";

export type SortColumn = "term" | "round" | "window" | "min" | "median";
export type SortDirection = "asc" | "desc";

const DEFAULT_VISIBLE_ROWS = 10;

/**
 * Sortable history table (extracted verbatim from
 * `views/bid-explorer/view.tsx`, mirror of the website `BidTable`): zebra
 * striping + expand. Host-agnostic: rows + theme via props; local sort UI
 * state stays inside.
 */
export const HistoryTable: React.FC<{
  points: ChartPoint[];
  c: ThemeColors;
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
      aria-sort={
        sortColumn === col
          ? sortDirection === "asc"
            ? "ascending"
            : "descending"
          : undefined
      }
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
      <div
        style={{
          overflowX: "auto",
          border: `1px solid ${c.border}`,
          borderRadius: 6,
        }}
      >
        <table
          role="table"
          style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}
        >
          <thead>
            <tr
              style={{
                borderBottom: `1px solid ${c.border}`,
                background: `${c.border}66`,
              }}
            >
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
                  background:
                    (groupIdx.get(r.key) ?? 0) % 2 === 1
                      ? `${c.border}55`
                      : "transparent",
                }}
              >
                <td style={{ padding: "6px 8px" }}>{r.term}</td>
                <td style={{ padding: "6px 8px" }}>{r.round}</td>
                <td style={{ padding: "6px 8px" }}>{r.window}</td>
                <td
                  style={{
                    padding: "6px 8px",
                    textAlign: "right",
                    fontFamily: "var(--font-geist-mono, ui-monospace)",
                  }}
                >
                  {r.min}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    textAlign: "right",
                    fontFamily: "var(--font-geist-mono, ui-monospace)",
                  }}
                >
                  {r.median}
                </td>
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
