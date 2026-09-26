import { compareRounds } from "@/modules/bidding/utils/round-order";
import { parseBidWindowKey } from "@/modules/bidding/utils/bid-window-key";

/**
 * Normalise and sort bid chart rows.
 *
 * Lives outside the chart component module so the component (and recharts with
 * it) can be dynamically imported without pulling the sort helper — and its
 * callers — into the initial chunk.
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
    .sort((a, b) => {
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
