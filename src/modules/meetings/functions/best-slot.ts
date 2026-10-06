export type SlotCounts = { availableCount: number; ifNeededCount: number };

export type BestSlot = SlotCounts & { slotIndex: number };

export type RankedSlot = BestSlot & { rank: number };

/**
 * Finds the top N timeslots that the most participants can attend,
 * sorted by highest available count, then highest if-needed count, then earliest time.
 */
export function findTopSlots(
  heatmap: Record<number, SlotCounts>,
  totalSlots: number,
  limit = 3,
): RankedSlot[] {
  const ranked: BestSlot[] = [];

  for (let slotIndex = 0; slotIndex < totalSlots; slotIndex++) {
    const counts = heatmap[slotIndex];
    if (!counts || counts.availableCount === 0) continue;
    ranked.push({ slotIndex, ...counts });
  }

  ranked.sort((a, b) => {
    if (b.availableCount !== a.availableCount) return b.availableCount - a.availableCount;
    if (b.ifNeededCount !== a.ifNeededCount) return b.ifNeededCount - a.ifNeededCount;
    return a.slotIndex - b.slotIndex;
  });

  return ranked.slice(0, limit).map((s, idx) => ({ ...s, rank: idx + 1 }));
}

/**
 * The slot the most people can attend, preferring more "if needed" responses as
 * a tie-break and the earliest slot after that. Null when nobody is available.
 */
export function findBestSlot(
  heatmap: Record<number, SlotCounts>,
  totalSlots: number,
): BestSlot | null {
  const [top] = findTopSlots(heatmap, totalSlots, 1);
  if (!top) return null;
  return {
    slotIndex: top.slotIndex,
    availableCount: top.availableCount,
    ifNeededCount: top.ifNeededCount,
  };
}
