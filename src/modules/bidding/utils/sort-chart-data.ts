import { parseBidWindowKey } from "./bid-window-key";
import { compareRounds } from "./round-order";

/**
 * Sort bid-window chart data chronologically: acad term first, then BOSS
 * round order, then window number. Lives in utils (not BidChart) so the
 * analytics client's static import never pulls recharts into the initial
 * bundle — BidChart itself is loaded dynamically (#515).
 */
export function sortChartData(
  data: (
    | { bidWindow: string; price: [number, number]; size: number }
    | { bidWindow: string; min: number; median: number; size: number }
  )[],
) {
  return [...data]
    .map((d) => {
      const min = "price" in d ? d.price[0] : d.min;
      const median = "price" in d ? d.price[1] : d.median;
      return {
        bidWindow: d.bidWindow,
        price: [min, median] as [number, number],
        min,
        median,
        size: d.size,
      };
    })
    .toSorted((a, b) => {
      const aKey = parseBidWindowKey(a.bidWindow);
      const bKey = parseBidWindowKey(b.bidWindow);
      // Sort by acadTerm first (asc / chronological), then round order, then window number
      if (aKey.acadTermId !== bKey.acadTermId)
        return aKey.acadTermId.localeCompare(bKey.acadTermId);
      const roundCmp = compareRounds(aKey.round, bKey.round);
      if (roundCmp !== 0) return roundCmp;
      return (
        (parseInt(aKey.window, 10) || 0) - (parseInt(bKey.window, 10) || 0)
      );
    });
}
