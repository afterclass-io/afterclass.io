/**
 * Pure helpers for resolving the "current" bid window from a list.
 *
 * "Current" = the upcoming (or still open) window; if none is ahead, the
 * last recorded one. Used to default term/window pickers and bid filters.
 *
 * All functions are pure — no side effects, no dependencies beyond stdlib.
 */

export type BidWindowLike = {
  id: number;
  opensAt: Date | string | null;
  closesAt: Date | string | null;
};

function toTime(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const t = (value instanceof Date ? value : new Date(value)).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Pick the current/upcoming bid window from a list.
 *
 * Algorithm (per product spec):
 * 1. Sort windows chronologically by `opensAt` (windows without dates last).
 * 2. Return the first window whose `closesAt` is still in the future
 *    (i.e. bidding is open or has yet to open).
 * 3. Otherwise return the chronologically latest window.
 *
 * Returns `null` for an empty list.
 */
export function pickCurrentBidWindow<T extends BidWindowLike>(
  windows: readonly T[],
  now: Date = new Date(),
): T | null {
  if (windows.length === 0) return null;

  const sorted = [...windows].toSorted((a, b) => {
    const aOpen = toTime(a.opensAt);
    const bOpen = toTime(b.opensAt);
    if (aOpen === null && bOpen === null) return 0;
    if (aOpen === null) return 1;
    if (bOpen === null) return -1;
    return aOpen - bOpen;
  });

  const nowMs = now.getTime();
  const open = sorted.find((w) => {
    const closes = toTime(w.closesAt);
    return closes !== null && closes > nowMs;
  });
  if (open) return open;

  // No window still open — fall back to the latest one with a known opensAt,
  // else the last in the sorted list.
  const withDates = sorted.filter((w) => toTime(w.opensAt) !== null);
  return withDates[withDates.length - 1] ?? sorted[sorted.length - 1]!;
}
