/**
 * Shared view-side formatting helpers (dependency-free: pure string ops only).
 */

/**
 * e$ money with 2 decimals and thousands separators (mirrors the website's
 * `formatBidCurrency` in `src/common/functions/format-bid-currency.ts`).
 */
export function formatBid(n: number): string {
  return `e$${n.toLocaleString("en-SG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a number to 2 decimal places. Returns "" for null/undefined/NaN
 * (views render empty rather than "NaN").
 */
export function format2dp(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  if (typeof n !== "number" || Number.isNaN(n)) return "";
  return n.toFixed(2);
}

/**
 * Shared ISO-date → YYYY-MM-DD slice (views must stay dependency-free, so no
 * Intl/timezone formatting here — just the date part both the timetable and
 * course-search views already rendered via `String(x).slice(0, 10)`).
 * Returns "" for null/undefined/empty input.
 */
export function formatExamDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return String(iso).slice(0, 10);
}
