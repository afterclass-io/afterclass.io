import { describe, it, expect } from "vitest";
import {
  timeToMinutes,
  layoutDay,
  GRID_START_MIN,
  GRID_END_MIN,
} from "./slot-math";
import type { ClassTimingLike, PositionedSlot } from "./slot-math";

// ---------------------------------------------------------------------------
// timeToMinutes
// ---------------------------------------------------------------------------
describe("timeToMinutes", () => {
  it("converts 08:15 to 495", () => {
    expect(timeToMinutes("08:15")).toBe(495);
  });

  it("converts 00:00 to 0", () => {
    expect(timeToMinutes("00:00")).toBe(0);
  });

  it("converts 22:00 to 1320", () => {
    expect(timeToMinutes("22:00")).toBe(1320);
  });

  it("converts 12:30 to 750", () => {
    expect(timeToMinutes("12:30")).toBe(750);
  });

  it("converts 23:59 to 1439", () => {
    expect(timeToMinutes("23:59")).toBe(1439);
  });

  it("throws on invalid format", () => {
    expect(() => timeToMinutes("abc")).toThrow("Invalid time format");
    expect(() => timeToMinutes("8:15")).toThrow("Invalid time format");
    expect(() => timeToMinutes("08-15")).toThrow("Invalid time format");
    expect(() => timeToMinutes("")).toThrow("Invalid time format");
  });
});

// ---------------------------------------------------------------------------
// layoutDay — basic positioning
// ---------------------------------------------------------------------------
describe("layoutDay — basic positioning", () => {
  const gridRange = GRID_END_MIN - GRID_START_MIN; // 840 min

  it("single slot: full-width (colCount=1), correct top/height percentages", () => {
    const timings: ClassTimingLike[] = [
      { startTime: "09:00", endTime: "11:00" },
    ];
    const result = layoutDay(timings);

    expect(result).toHaveLength(1);
    const slot = result[0]!;
    expect(slot.colIndex).toBe(0);
    expect(slot.colCount).toBe(1);

    const expectedTop =
      ((540 - GRID_START_MIN) / gridRange) * 100; // 540 = 9*60
    const expectedHeight = ((660 - 540) / gridRange) * 100; // 120 min
    expect(slot.topPct).toBeCloseTo(expectedTop, 5);
    expect(slot.heightPct).toBeCloseTo(expectedHeight, 5);
  });

  it("two non-overlapping slots: same column (colIndex=0, colCount=1)", () => {
    const timings: ClassTimingLike[] = [
      { startTime: "08:00", endTime: "10:00" },
      { startTime: "12:00", endTime: "14:00" },
    ];
    const result = layoutDay(timings);

    expect(result).toHaveLength(2);
    for (const slot of result) {
      expect(slot.colIndex).toBe(0);
      expect(slot.colCount).toBe(1);
    }
  });

  it("two overlapping slots: split into colCount=2, different colIndexes", () => {
    const timings: ClassTimingLike[] = [
      { startTime: "10:00", endTime: "14:00" },
      { startTime: "12:00", endTime: "16:00" },
    ];
    const result = layoutDay(timings);

    expect(result).toHaveLength(2);
    // Both share colCount=2
    for (const slot of result) {
      expect(slot.colCount).toBe(2);
    }
    // Different sub-columns
    const cols = result.map((s) => s.colIndex);
    expect(cols).toContain(0);
    expect(cols).toContain(1);
    expect(new Set(cols).size).toBe(2);
  });

  it("three-way overlap: colCount=3 for all", () => {
    const timings: ClassTimingLike[] = [
      { startTime: "09:00", endTime: "12:00" },
      { startTime: "10:00", endTime: "13:00" },
      { startTime: "11:00", endTime: "14:00" },
    ];
    const result = layoutDay(timings);

    expect(result).toHaveLength(3);
    for (const slot of result) {
      expect(slot.colCount).toBe(3);
    }
    const cols = new Set(result.map((s) => s.colIndex));
    expect(cols.size).toBe(3);
    expect(cols.has(0)).toBe(true);
    expect(cols.has(1)).toBe(true);
    expect(cols.has(2)).toBe(true);
  });

  it("boundary slot exactly at 08:00-22:00", () => {
    const timings: ClassTimingLike[] = [
      { startTime: "08:00", endTime: "22:00" },
    ];
    const result = layoutDay(timings);

    expect(result).toHaveLength(1);
    const slot = result[0]!;
    expect(slot.topPct).toBeCloseTo(0, 5);
    expect(slot.heightPct).toBeCloseTo(100, 5);
  });

  it("clamps slot starting before GRID_START_MIN", () => {
    const timings: ClassTimingLike[] = [
      { startTime: "07:00", endTime: "10:00" },
    ];
    const result = layoutDay(timings);

    expect(result).toHaveLength(1);
    const slot = result[0]!;
    // Should clamp: topPct should be 0 (starts at grid start),
    // height should be from 08:00 to 10:00 = 120 min
    expect(slot.topPct).toBe(0);
    expect(slot.heightPct).toBeCloseTo(((600 - 480) / 840) * 100, 5);
  });

  it("clamps slot ending after GRID_END_MIN", () => {
    const timings: ClassTimingLike[] = [
      { startTime: "20:00", endTime: "23:00" },
    ];
    const result = layoutDay(timings);

    expect(result).toHaveLength(1);
    const slot = result[0]!;
    // Height should be from 20:00 to 22:00 = 120 min
    expect(slot.heightPct).toBeCloseTo(((1320 - 1200) / 840) * 100, 5);
    // top should be from 20:00
    expect(slot.topPct).toBeCloseTo(((1200 - 480) / 840) * 100, 5);
  });

  it("filters out slots entirely outside grid range", () => {
    const timings: ClassTimingLike[] = [
      { startTime: "06:00", endTime: "07:00" }, // before grid
      { startTime: "09:00", endTime: "10:00" }, // valid
      { startTime: "23:00", endTime: "23:30" }, // after grid
    ];
    const result = layoutDay(timings);

    expect(result).toHaveLength(1);
    expect(result[0]!.timing.startTime).toBe("09:00");
  });
});

// ---------------------------------------------------------------------------
// layoutDay — overlap packing scenarios
// ---------------------------------------------------------------------------
describe("layoutDay — overlap packing", () => {
  it("sorts by start time: early slot gets colIndex 0", () => {
    const timings: ClassTimingLike[] = [
      { startTime: "14:00", endTime: "16:00" },
      { startTime: "10:00", endTime: "12:00" },
    ];
    const result = layoutDay(timings);

    expect(result).toHaveLength(2);
    // The 10:00 slot should come first in the result, get colIndex 0
    const first = result.find((s) => s.timing.startTime === "10:00")!;
    const second = result.find((s) => s.timing.startTime === "14:00")!;
    expect(first.colIndex).toBe(0);
    expect(first.colCount).toBe(1); // no overlap
    expect(second.colIndex).toBe(0);
    expect(second.colCount).toBe(1);
  });

  it("partial overlap chain: A-B overlap, B-C overlap, but A-C don't", () => {
    // A: 08:00-10:00, B: 09:00-11:00, C: 10:30-12:30
    // A overlaps B, B overlaps C, but A does NOT overlap C
    // With lane packing: A→lane0, B→lane1, C fits in lane0 after A → colCount=2
    const timings: ClassTimingLike[] = [
      { startTime: "08:00", endTime: "10:00" },
      { startTime: "09:00", endTime: "11:00" },
      { startTime: "10:30", endTime: "12:30" },
    ];
    const result = layoutDay(timings);

    expect(result).toHaveLength(3);
    // All in same transitive component → share colCount=2 (only 2 lanes needed)
    for (const slot of result) {
      expect(slot.colCount).toBe(2);
    }
    // A and C share lane 0, B alone in lane 1
    const a = result.find((s) => s.timing.startTime === "08:00")!;
    const b = result.find((s) => s.timing.startTime === "09:00")!;
    const c = result.find((s) => s.timing.startTime === "10:30")!;
    expect(a.colIndex).toBe(0);
    expect(b.colIndex).toBe(1);
    expect(c.colIndex).toBe(0);
  });

  it("returns empty array for empty input", () => {
    expect(layoutDay([])).toEqual([]);
  });

  it("preserves original timing data in output", () => {
    const timings: ClassTimingLike[] = [
      {
        startTime: "09:00",
        endTime: "11:00",
        dayOfWeek: "Monday",
        venue: "SIS SR 2.1",
      },
    ];
    const result = layoutDay(timings);
    expect(result[0]!.timing).toEqual(timings[0]);
  });

  it("complex scenario: mixed overlaps and non-overlaps", () => {
    const timings: ClassTimingLike[] = [
      { startTime: "08:00", endTime: "10:00" }, // A
      { startTime: "09:00", endTime: "11:00" }, // B (overlaps A)
      { startTime: "12:00", endTime: "14:00" }, // C (no overlap with A/B)
      { startTime: "13:00", endTime: "15:00" }, // D (overlaps C)
    ];
    const result = layoutDay(timings);

    expect(result).toHaveLength(4);

    // A and B overlap -> colCount=2
    const a = result.find((s) => s.timing.startTime === "08:00")!;
    const b = result.find((s) => s.timing.startTime === "09:00")!;
    expect(a.colCount).toBe(2);
    expect(b.colCount).toBe(2);

    // C and D overlap -> colCount=2
    const c = result.find((s) => s.timing.startTime === "12:00")!;
    const d = result.find((s) => s.timing.startTime === "13:00")!;
    expect(c.colCount).toBe(2);
    expect(d.colCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe("constants", () => {
  it("GRID_START_MIN is 480 (08:00)", () => {
    expect(GRID_START_MIN).toBe(480);
  });

  it("GRID_END_MIN is 1320 (22:00)", () => {
    expect(GRID_END_MIN).toBe(1320);
  });
});
