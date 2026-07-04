/**
 * BOSS round ordering.
 *
 * This is the SINGLE source of truth for round sort order. Rounds not in this
 * map sort to the end in alphabetical order, so new BOSS rounds don't break the
 * chart — they just appear at the end until the map is updated.
 *
 * This ordering has been stable across 5+ years of SMU history (2021–2026).
 * The 7 rounds are: 1, 1A, 1B, 1C, 1F, 2, 2A.
 */
export const ROUND_ORDER: Record<string, number> = {
  "1": 0,
  "1A": 1,
  "1B": 2,
  "1C": 3,
  "1F": 4,
  "2": 5,
  "2A": 6,
};

/** Maximum sort index for known rounds — unknown rounds sort after this */
const KNOWN_ROUND_MAX = Object.keys(ROUND_ORDER).length;

/**
 * Compare two round strings by BOSS ordering.
 * Unknown rounds sort alphabetically after all known rounds.
 *
 * @returns negative if a < b, positive if a > b, 0 if equal
 */
export function compareRounds(a: string, b: string): number {
  const orderA = ROUND_ORDER[a] ?? KNOWN_ROUND_MAX;
  const orderB = ROUND_ORDER[b] ?? KNOWN_ROUND_MAX;
  if (orderA !== orderB) return orderA - orderB;
  // Both unknown — sort alphabetically so behavior is predictable
  if (orderA === KNOWN_ROUND_MAX) return a.localeCompare(b);
  return 0;
}
