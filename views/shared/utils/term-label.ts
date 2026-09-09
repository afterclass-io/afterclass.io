/**
 * Shorten a term label for the chart x-axis, e.g. "AY2025/26-T1" -> "25/26-T1".
 *
 * Extracted from `views/bid-explorer/view.tsx`'s `shortTermLabel`, which was
 * itself copied from `inferAcadTerm`'s shortLabel idea
 * (`src/common/functions/inferAcadTerm.ts`) — pure string slicing, no deps,
 * so it can live here dependency-free.
 */

/**
 * Shorten a term label for the chart x-axis.
 *
 * - Slashed form "AY2025/26-T1" -> "25/26-T1" (also "AY2024/25-T3A" -> "24/25-T3A")
 * - Compact DB form "AY202627T1" -> "26-27 T1" (same as inferAcadTerm's
 *   shortLabel: `${year.slice(4,6)}-${year.slice(6,8)} T${term}`)
 * - Anything else passes through unchanged.
 */
export function shortTermLabel(acadTermId: string): string {
  const slashed = /^AY(\d{2})(\d{2})\/(\d{2})-(T.+)$/.exec(acadTermId);
  if (slashed) return `${slashed[2]}/${slashed[3]}-${slashed[4]}`;
  const compact = /^(AY\d+)T(.+)$/.exec(acadTermId);
  if (compact) {
    const year = compact[1]!;
    return `${year.slice(4, 6)}-${year.slice(6, 8)} T${compact[2]}`;
  }
  return acadTermId;
}
