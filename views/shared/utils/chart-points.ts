import { compareRounds } from "./round-order";

/**
 * Chart-point grouping for bid history.
 *
 * Semantics follow `normalizeHistory` in
 * `src/server/mcp/tools/read/explore-bid-options.ts:38-67` (server is source
 * of truth): at most one row per term+round+window, duplicates collapse to
 * the lowest min/median (independent `Math.min` on each — conservative
 * aggregation), and rows with null min/median are dropped (no clearing
 * prices yet).
 *
 * Sort divergence (explicit): the server sorts rounds with
 * `localeCompare(..., { numeric: true })` while the view sorted with BOSS
 * `compareRounds`. Shared code uses BOSS `compareRounds` — BOSS rounds
 * ("1A" vs "1") sort wrong under localeCompare-numeric, and the view's
 * round filter + table sort already used BOSS order, so BOSS is the
 * consistent choice for everything the chart renders.
 */

/** Flat history row in (vacancy is ignored — the view never renders it). */
export type HistoryInput = {
  acadTermId: string;
  round: string;
  window: number | string;
  min: number | null;
  median: number | null;
};

/**
 * One grouped chart point. Structured fields travel with the point:
 * acadTermIds can contain "/" (e.g. "AY2024/25-T1"), so splitting the joined
 * key back apart is unreliable.
 */
export type ChartPoint = {
  key: string;
  acadTermId: string;
  round: string;
  window: string;
  min: number;
  median: number;
};

export const pointKey = (
  h: Pick<HistoryInput, "acadTermId" | "round" | "window">,
): string => `${h.acadTermId}/${h.round}/${h.window}`;

/**
 * INVARIANT: one row per term+round+window key — duplicates collapse
 * into a single row with the lowest min/median winning
 * (conservative aggregation). Sorted chronologically: acadTermId,
 * then BOSS round order, then window.
 */
export function buildChartPoints(history: HistoryInput[]): ChartPoint[] {
  const grouped = new Map<string, ChartPoint>();
  for (const h of history) {
    if (h.min === null || h.median === null) continue;
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
    if (a.acadTermId !== b.acadTermId)
      return a.acadTermId.localeCompare(b.acadTermId);
    const roundCmp = compareRounds(a.round, b.round);
    if (roundCmp !== 0) return roundCmp;
    return (parseInt(a.window, 10) || 0) - (parseInt(b.window, 10) || 0);
  });
}

/**
 * Contiguous acadTermId runs for AY-group shading + zebra striping.
 * Verbatim from `views/bid-explorer/view.tsx`.
 */
export function computeTermGroups(points: ChartPoint[]): string[][] {
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
}
