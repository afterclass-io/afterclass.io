/**
 * Pure math for the bids session dashboard shown above the bids table.
 *
 * All functions are pure — no side effects, no dependencies beyond stdlib.
 */

export type SessionBid = {
  bidAmount: number;
  status: string;
};

export type BidsSessionSummary = {
  /** Bids with status PLANNED in the term (all rounds/windows). */
  plannedCount: number;
  /** Bids with status SECURED in the term. */
  securedCount: number;
  /** Sum of SECURED bid amounts (e$ already spent). */
  amountSpent: number;
  /** balance − amountSpent. */
  remaining: number;
};

/**
 * Summarise a term's bids for the dashboard.
 *
 * Only PLANNED and SECURED bids count: DROPPED (course dropped after
 * securing), CANCELLED (bid withdrawn) and MISSED bids are excluded from
 * every figure, so they never count toward e$ spent.
 *
 * @param bids     All bids in the term being viewed.
 * @param balance  The user's e$ budget for the term (0 when unset).
 */
export function summarizeSessionBids(
  bids: readonly SessionBid[],
  balance: number,
): BidsSessionSummary {
  let plannedCount = 0;
  let securedCount = 0;
  let amountSpent = 0;

  for (const bid of bids) {
    if (bid.status === "SECURED") {
      securedCount += 1;
      amountSpent += bid.bidAmount;
    } else if (bid.status === "PLANNED") {
      plannedCount += 1;
    }
  }

  return {
    plannedCount,
    securedCount,
    amountSpent,
    remaining: balance - amountSpent,
  };
}
