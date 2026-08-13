/**
 * Academic term grouping for bid window data.
 *
 * Shared helper used by BidChart and BidTable to partition sorted bid-window
 * data into contiguous academic-year groups for rendering (two-tier X-axis
 * labels, alternating background shading, zebra striping).
 *
 * Round ordering within each group is governed by
 * {@link @/modules/bidding/utils/round-order} which is the single source of
 * truth for BOSS canonical round order (1, 1A, 1B, 1C, 1F, 2, 2A, …).
 */

import { inferAcadTerm } from "@/common/functions";

/** An item with at least a bidWindow string for grouping */
export interface HasBidWindow {
  bidWindow: string;
}

/** Academic year group computed from sorted data */
export interface AYGroup {
  acadTermId: string;
  shortLabel: string;
  firstBidWindow: string;
  lastBidWindow: string;
}

/**
 * Compute contiguous academic year groups from data sorted by bidWindow.
 *
 * Each group represents a contiguous run of data points with the same
 * `acadTermId` (the first segment of the `bidWindow` key, e.g. "AY202526T1").
 *
 * @param sorted  Array of items with a `bidWindow` property, pre-sorted in
 *                display order (chronological: acadTermId → round → window).
 * @returns       One group per unique contiguous acadTermId run.
 */
export function computeAcadTermGroups<T extends HasBidWindow>(
  sorted: T[],
): AYGroup[] {
  const groups: AYGroup[] = [];
  let current: AYGroup | null = null;

  for (const point of sorted) {
    const [acadTermId] = point.bidWindow.split("/");
    if (!acadTermId) continue;

    if (!current || current.acadTermId !== acadTermId) {
      const { shortLabel } = inferAcadTerm(acadTermId);
      current = {
        acadTermId,
        shortLabel,
        firstBidWindow: point.bidWindow,
        lastBidWindow: point.bidWindow,
      };
      groups.push(current);
    } else {
      current.lastBidWindow = point.bidWindow;
    }
  }

  return groups;
}

/**
 * Build a Map from each bidWindow key to the zero-based index of the academic
 * year group it belongs to. Useful for per-row styling (e.g. zebra striping).
 *
 * @param sorted  The same sorted array passed to {@link computeAcadTermGroups}.
 * @param groups  The groups returned by {@link computeAcadTermGroups}.
 */
export function buildGroupIndexMap<T extends HasBidWindow>(
  sorted: T[],
  groups: AYGroup[],
): Map<string, number> {
  const map = new Map<string, number>();
  let groupIdx = 0;

  for (const point of sorted) {
    // Advance groupIdx if we've passed the current group's lastBidWindow
    while (
      groupIdx < groups.length &&
      groups[groupIdx]!.lastBidWindow !== point.bidWindow &&
      groups[groupIdx]!.lastBidWindow < point.bidWindow
    ) {
      groupIdx++;
    }
    // Safety clamp — should never happen with well-formed data
    if (groupIdx >= groups.length) groupIdx = groups.length - 1;
    map.set(point.bidWindow, groupIdx);
  }

  return map;
}
