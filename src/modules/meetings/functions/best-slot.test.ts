import { describe, expect, it } from "vitest";

import { findBestSlot, findTopSlots } from "./best-slot";

describe("findBestSlot", () => {
  it("returns null when nobody is available", () => {
    expect(findBestSlot({}, 10)).toBeNull();
    expect(findBestSlot({ 2: { availableCount: 0, ifNeededCount: 3 } }, 10)).toBeNull();
  });

  it("picks the slot with the most available people", () => {
    const heatmap = {
      1: { availableCount: 2, ifNeededCount: 0 },
      4: { availableCount: 3, ifNeededCount: 0 },
    };
    expect(findBestSlot(heatmap, 10)).toEqual({
      slotIndex: 4,
      availableCount: 3,
      ifNeededCount: 0,
    });
  });

  it("breaks ties on if-needed count, then on the earliest slot", () => {
    const heatmap = {
      1: { availableCount: 2, ifNeededCount: 1 },
      3: { availableCount: 2, ifNeededCount: 2 },
      5: { availableCount: 2, ifNeededCount: 2 },
    };
    expect(findBestSlot(heatmap, 10)?.slotIndex).toBe(3);
  });

  it("ignores slots beyond the poll window", () => {
    expect(
      findBestSlot({ 20: { availableCount: 5, ifNeededCount: 0 } }, 10),
    ).toBeNull();
  });

  describe("findTopSlots", () => {
    it("returns top N slots ordered by availability, if-needed, and time", () => {
      const heatmap = {
        1: { availableCount: 3, ifNeededCount: 1 },
        2: { availableCount: 5, ifNeededCount: 0 },
        3: { availableCount: 4, ifNeededCount: 2 },
        4: { availableCount: 4, ifNeededCount: 1 },
      };
      const top = findTopSlots(heatmap, 10, 3);
      expect(top).toHaveLength(3);
      expect(top[0]).toMatchObject({ slotIndex: 2, rank: 1, availableCount: 5 });
      expect(top[1]).toMatchObject({ slotIndex: 3, rank: 2, availableCount: 4, ifNeededCount: 2 });
      expect(top[2]).toMatchObject({ slotIndex: 4, rank: 3, availableCount: 4, ifNeededCount: 1 });
    });

    it("returns empty array when no slots have availability", () => {
      expect(findTopSlots({}, 10)).toEqual([]);
      expect(findTopSlots({ 1: { availableCount: 0, ifNeededCount: 2 } }, 10)).toEqual([]);
    });
  });
});

