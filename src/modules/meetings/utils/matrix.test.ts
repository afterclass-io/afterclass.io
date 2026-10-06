import { describe, expect, it } from "vitest";
import {
  calculateHeatmapRatio,
  dateTimeToSlotIndex,
  formatDateToISO,
  generateDateRange,
  generateTimeSlots,
  getDaysDiff,
  getHeatmapBackgroundColor,
  getTotalSlots,
  normalizeDate,
  slotIndexToDateTime,
} from "./matrix";

describe("matrix slot math utilities", () => {
  describe("normalizeDate & getDaysDiff", () => {
    it("normalizes date strings and date objects to midnight", () => {
      const d1 = normalizeDate("2026-10-12");
      expect(d1.getFullYear()).toBe(2026);
      expect(d1.getMonth()).toBe(9); // 0-indexed October
      expect(d1.getDate()).toBe(12);
      expect(d1.getHours()).toBe(0);

      const d2 = normalizeDate(new Date(2026, 9, 12, 15, 30, 45));
      expect(d2.getDate()).toBe(12);
      expect(d2.getHours()).toBe(0);
    });

    it("calculates day difference accurately across months", () => {
      const start = new Date(2026, 9, 30); // Oct 30
      const end = new Date(2026, 10, 2); // Nov 2
      expect(getDaysDiff(end, start)).toBe(3);
      expect(getDaysDiff(start, end)).toBe(-3);
      expect(getDaysDiff(start, start)).toBe(0);
    });
  });

  describe("generateDateRange", () => {
    it("generates inclusive date range for multiple days", () => {
      const range = generateDateRange("2026-10-12", "2026-10-15");
      expect(range).toHaveLength(4);
      expect(range[0]?.getDate()).toBe(12);
      expect(range[1]?.getDate()).toBe(13);
      expect(range[2]?.getDate()).toBe(14);
      expect(range[3]?.getDate()).toBe(15);
    });

    it("generates single day when start equals end", () => {
      const range = generateDateRange("2026-10-12", "2026-10-12");
      expect(range).toHaveLength(1);
      expect(range[0]?.getDate()).toBe(12);
    });

    it("returns empty array when startDate is after endDate", () => {
      const range = generateDateRange("2026-10-15", "2026-10-12");
      expect(range).toEqual([]);
    });
  });

  describe("generateTimeSlots", () => {
    it("generates standard 15-minute intervals between 08:00 and 10:00", () => {
      const slots = generateTimeSlots(8, 10, 15);
      expect(slots).toEqual([
        "08:00",
        "08:15",
        "08:30",
        "08:45",
        "09:00",
        "09:15",
        "09:30",
        "09:45",
      ]);
      expect(slots).toHaveLength(8);
    });

    it("generates 30-minute intervals", () => {
      const slots = generateTimeSlots(9, 11, 30);
      expect(slots).toEqual(["09:00", "09:30", "10:00", "10:30"]);
    });

    it("returns empty array for invalid hour ranges or step sizes", () => {
      expect(generateTimeSlots(10, 10, 15)).toEqual([]);
      expect(generateTimeSlots(12, 10, 15)).toEqual([]);
      expect(generateTimeSlots(8, 10, 0)).toEqual([]);
      expect(generateTimeSlots(8, 10, -15)).toEqual([]);
    });
  });

  describe("slotIndexToDateTime & dateTimeToSlotIndex", () => {
    const startDate = new Date(2026, 9, 12); // Monday, Oct 12, 2026
    const startHour = 8;
    const endHour = 22;
    const slotMinutes = 15;
    // (22 - 8) * 4 = 56 slots per day

    it("converts slotIndex 0 to first slot of day 0 (08:00)", () => {
      const { date, timeStr } = slotIndexToDateTime(
        0,
        startDate,
        startHour,
        endHour,
        slotMinutes,
      );
      expect(date.getDate()).toBe(12);
      expect(timeStr).toBe("08:00");
      expect(date.getHours()).toBe(8);
      expect(date.getMinutes()).toBe(0);
    });

    it("converts last slot of day 0 (slot 55 = 21:45)", () => {
      const { date, timeStr } = slotIndexToDateTime(
        55,
        startDate,
        startHour,
        endHour,
        slotMinutes,
      );
      expect(date.getDate()).toBe(12);
      expect(timeStr).toBe("21:45");
      expect(date.getHours()).toBe(21);
      expect(date.getMinutes()).toBe(45);
    });

    it("converts slot on day 1 (slot 56 = Oct 13 08:00)", () => {
      const { date, timeStr } = slotIndexToDateTime(
        56,
        startDate,
        startHour,
        endHour,
        slotMinutes,
      );
      expect(date.getDate()).toBe(13);
      expect(timeStr).toBe("08:00");
    });

    it("maps target Date back to slot index accurately", () => {
      // Oct 12 at 08:00 -> slot 0
      const target0 = new Date(2026, 9, 12, 8, 0);
      expect(
        dateTimeToSlotIndex(target0, startDate, startHour, endHour, slotMinutes),
      ).toBe(0);

      // Oct 12 at 08:14 -> still slot 0 (08:00 - 08:15 interval)
      const target14 = new Date(2026, 9, 12, 8, 14);
      expect(
        dateTimeToSlotIndex(target14, startDate, startHour, endHour, slotMinutes),
      ).toBe(0);

      // Oct 12 at 08:15 -> slot 1
      const target15 = new Date(2026, 9, 12, 8, 15);
      expect(
        dateTimeToSlotIndex(target15, startDate, startHour, endHour, slotMinutes),
      ).toBe(1);

      // Oct 13 at 09:30 -> day 1, (9:30 - 8:00) = 1.5h = 6 slots -> 56 + 6 = 62
      const targetNextDay = new Date(2026, 9, 13, 9, 30);
      expect(
        dateTimeToSlotIndex(
          targetNextDay,
          startDate,
          startHour,
          endHour,
          slotMinutes,
        ),
      ).toBe(62);
    });

    it("returns null for times outside the daily window or before startDate", () => {
      // Before startHour (07:59)
      const beforeStart = new Date(2026, 9, 12, 7, 59);
      expect(
        dateTimeToSlotIndex(
          beforeStart,
          startDate,
          startHour,
          endHour,
          slotMinutes,
        ),
      ).toBeNull();

      // At endHour (22:00) -> outside [08:00, 22:00)
      const atEnd = new Date(2026, 9, 12, 22, 0);
      expect(
        dateTimeToSlotIndex(atEnd, startDate, startHour, endHour, slotMinutes),
      ).toBeNull();

      // Date before startDate
      const priorDate = new Date(2026, 9, 11, 10, 0);
      expect(
        dateTimeToSlotIndex(
          priorDate,
          startDate,
          startHour,
          endHour,
          slotMinutes,
        ),
      ).toBeNull();
    });

    it("verifies roundtrip bidirectional consistency", () => {
      for (let slot = 0; slot < 168; slot += 7) {
        const { date } = slotIndexToDateTime(
          slot,
          startDate,
          startHour,
          endHour,
          slotMinutes,
        );
        const resolvedSlot = dateTimeToSlotIndex(
          date,
          startDate,
          startHour,
          endHour,
          slotMinutes,
        );
        expect(resolvedSlot).toBe(slot);
      }
    });

    it("throws on negative slotIndex", () => {
      expect(() =>
        slotIndexToDateTime(-1, startDate, startHour, endHour, slotMinutes),
      ).toThrow("slotIndex must be non-negative");
    });
  });

  describe("getTotalSlots", () => {
    it("calculates total slots across multi-day range", () => {
      // 3 days, 8:00 to 22:00 = 14 hours/day * 4 = 56 slots/day -> 3 * 56 = 168
      const total = getTotalSlots("2026-10-12", "2026-10-14", 8, 22, 15);
      expect(total).toBe(168);
    });
  });

  describe("calculateHeatmapRatio & getHeatmapBackgroundColor", () => {
    it("returns 0 when there are no participants", () => {
      expect(calculateHeatmapRatio(0, 0, 0)).toBe(0);
    });

    it("computes ratio with available and if-needed weights", () => {
      // 4 available, 2 if-needed out of 5 participants:
      // (4 + 0.5 * 2) / 5 = 5 / 5 = 1.0
      expect(calculateHeatmapRatio(4, 2, 5)).toBe(1.0);

      // 2 available, 2 if-needed out of 4 participants:
      // (2 + 1) / 4 = 0.75
      expect(calculateHeatmapRatio(2, 2, 4)).toBe(0.75);
    });

    it("excludes if-needed when hideIfNeeded is true", () => {
      // 2 available, 2 if-needed out of 4 participants:
      // With hideIfNeeded: 2 / 4 = 0.5
      expect(calculateHeatmapRatio(2, 2, 4, true)).toBe(0.5);
    });

    it("clamps ratio between 0 and 1", () => {
      expect(calculateHeatmapRatio(10, 10, 5)).toBe(1);
    });

    it("generates green background styles for heatmap ratios", () => {
      expect(getHeatmapBackgroundColor(0)).toBe("transparent");
      const highStyle = getHeatmapBackgroundColor(1.0);
      expect(highStyle).toContain("var(--mt-available)");
      expect(highStyle).toContain("95%");
    });
  });

  describe("formatDateToISO", () => {
    it("formats Date objects and date strings to YYYY-MM-DD", () => {
      const d = new Date(2026, 9, 15); // Month is 0-indexed, so 9 is October
      expect(formatDateToISO(d)).toBe("2026-10-15");
      expect(formatDateToISO("2026-10-15T12:00:00Z")).toBe("2026-10-15");
    });
  });
});
