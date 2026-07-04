/**
 * Shared utility for bid window key formatting and parsing.
 *
 * Bid window keys are composite strings of the form "{acadTermId}/{round}/{window}",
 * e.g. "AY202627T1/1A/2". This format is used across BidAnalyticsClient, BidTable,
 * BidChart, and analytics/page.tsx for deduplication, sort keys, and URL parameters.
 */

/** Build a bid window key from its constituent parts. */
export function formatBidWindowKey(
  acadTermId: string,
  round: string,
  window: number | string,
): string {
  return `${acadTermId}/${round}/${window}`;
}

/** Parse a bid window key back into its constituent parts. */
export function parseBidWindowKey(key: string): {
  acadTermId: string;
  round: string;
  window: string;
} {
  const [acadTermId, round, window] = key.split("/");
  return {
    acadTermId: acadTermId ?? "",
    round: round ?? "",
    window: window ?? "",
  };
}
