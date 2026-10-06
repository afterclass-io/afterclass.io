import { describe, expect, it } from "vitest";

import { dragSelectionRange, groupSlotsIntoRuns, slotsBetween } from "./slot-runs";

describe("groupSlotsIntoRuns", () => {
  it("merges consecutive slots into one run", () => {
    expect(groupSlotsIntoRuns([4, 5, 6], 56)).toEqual([
      { dayIndex: 0, startSlot: 4, length: 3 },
    ]);
  });

  it("splits runs at gaps and ignores input order and duplicates", () => {
    expect(groupSlotsIntoRuns([10, 3, 4, 3, 11], 56)).toEqual([
      { dayIndex: 0, startSlot: 3, length: 2 },
      { dayIndex: 0, startSlot: 10, length: 2 },
    ]);
  });

  it("never lets a run cross a day boundary", () => {
    expect(groupSlotsIntoRuns([54, 55, 56, 57], 56)).toEqual([
      { dayIndex: 0, startSlot: 54, length: 2 },
      { dayIndex: 1, startSlot: 0, length: 2 },
    ]);
  });

  it("returns nothing for empty input or an invalid day length", () => {
    expect(groupSlotsIntoRuns([], 56)).toEqual([]);
    expect(groupSlotsIntoRuns([1, 2], 0)).toEqual([]);
  });
});

describe("dragSelectionRange", () => {
  it("orders the range regardless of drag direction", () => {
    expect(dragSelectionRange(10, 14, 56)).toEqual({ start: 10, end: 14 });
    expect(dragSelectionRange(14, 10, 56)).toEqual({ start: 10, end: 14 });
  });

  it("clamps the pointer to the anchor's day column", () => {
    expect(dragSelectionRange(60, 130, 56)).toEqual({ start: 60, end: 111 });
    expect(dragSelectionRange(60, 20, 56)).toEqual({ start: 56, end: 60 });
  });

  it("selects a single slot when pointer stays on the anchor", () => {
    expect(dragSelectionRange(7, 7, 56)).toEqual({ start: 7, end: 7 });
  });
});

describe("slotsBetween", () => {
  it("fills the gap downwards and upwards, excluding the start", () => {
    expect(slotsBetween(3, 6, 56)).toEqual([4, 5, 6]);
    expect(slotsBetween(6, 3, 56)).toEqual([5, 4, 3]);
  });

  it("returns only the target when the pointer jumps to another day", () => {
    expect(slotsBetween(50, 60, 56)).toEqual([60]);
  });

  it("returns nothing when the pointer has not left the start slot", () => {
    expect(slotsBetween(4, 4, 56)).toEqual([]);
  });
});
