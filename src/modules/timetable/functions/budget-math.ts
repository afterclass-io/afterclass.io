/**
 * Pure budget-summary math for bid planning.
 *
 * Groups bids by round, computes per-round & grand totals, and calculates
 * cumulative overshoot against a user-set e$ balance.
 *
 * All functions are pure — no side effects, no dependencies beyond stdlib.
 *
 * Round ordering is delegated to {@link @/modules/bidding/utils/round-order}
 * which is the single source of truth for BOSS canonical round order
 * (1, 1A, 1B, 1C, 1F, 2, 2A, …). Unknown rounds sort alphabetically after
 * all known rounds.
 */
import { compareRounds } from "@/modules/bidding/utils/round-order";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BidSummary = {
  amount: number;
  round: string;
  window: number;
};

export type RoundTotal = {
  round: string;
  total: number;
  windows: { window: number; amount: number }[];
};

export type BudgetSummary = {
  roundTotals: RoundTotal[];
  grandTotal: number;
  balance: number;
  /** grandTotal - balance, floored at 0 */
  overshoot: number;
  /** Cumulative overshoot after each round, in canonical round order */
  overshootByRound: { round: string; overshoot: number }[];
};

// ---------------------------------------------------------------------------
// BOSS canonical round ordering
// ---------------------------------------------------------------------------

/**
 * Compare two round labels in canonical BOSS order.
 *
 * Delegates to the single source of truth:
 * {@link @/modules/bidding/utils/round-order#compareRounds}.
 *
 * Known rounds (1, 1A, 1B, 1C, 1F, 2, 2A) are ordered by their fixed index;
 * unknown rounds sort alphabetically after all known rounds.
 */
export { compareRounds as compareRound };

// ---------------------------------------------------------------------------
// summarizeBidsByRound
// ---------------------------------------------------------------------------

/**
 * Group bids by round, compute per-window & per-round totals, and
 * calculate cumulative overshoot against a user-set balance.
 *
 * Rounds are returned in canonical BOSS order. See
 * {@link @/modules/bidding/utils/round-order} for the single source of truth.
 *
 * @param bids    Flat list of bid amounts keyed by round & window.
 * @param balance The user's e$ balance for the academic term.
 * @returns       A structured summary suitable for rendering a budget panel.
 */
export function summarizeBidsByRound(
  bids: BidSummary[],
  balance: number,
): BudgetSummary {
  // --- Group bids by round, then by window ---
  const byRound = new Map<string, Map<number, number>>();

  for (const bid of bids) {
    let windowMap = byRound.get(bid.round);
    if (!windowMap) {
      windowMap = new Map();
      byRound.set(bid.round, windowMap);
    }
    windowMap.set(bid.window, (windowMap.get(bid.window) ?? 0) + bid.amount);
  }

  // --- Sort rounds canonically ---
  const sortedRounds = [...byRound.keys()].toSorted(compareRounds);

  // --- Build RoundTotal[] ---
  let grandTotal = 0;
  const roundTotals: RoundTotal[] = [];

  for (const round of sortedRounds) {
    const windowMap = byRound.get(round)!;
    const windows: { window: number; amount: number }[] = [];
    let roundSum = 0;

    for (const [window, amount] of [...windowMap.entries()].toSorted(
      (a, b) => a[0] - b[0],
    )) {
      windows.push({ window, amount });
      roundSum += amount;
    }

    grandTotal += roundSum;
    roundTotals.push({ round, total: roundSum, windows });
  }

  // --- Compute cumulative overshoot per round ---
  const overshootByRound: { round: string; overshoot: number }[] = [];
  let runningTotal = 0;

  for (const rt of roundTotals) {
    runningTotal += rt.total;
    const overshoot = Math.max(0, runningTotal - balance);
    overshootByRound.push({ round: rt.round, overshoot });
  }

  const overshoot = Math.max(0, grandTotal - balance);

  return {
    roundTotals,
    grandTotal,
    balance,
    overshoot,
    overshootByRound,
  };
}
