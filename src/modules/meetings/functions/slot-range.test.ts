import { describe, expect, it } from "vitest";

import { slotRangeToInstants, summarizeRangeAvailability } from "./slot-range";

const WINDOW = {
  startDate: "2026-10-12",
  startHour: 8,
  endHour: 22,
  slotMinutes: 15,
};

describe("slotRangeToInstants", () => {
  it("maps the first slot to the day's opening hour in Singapore time", () => {
    const { start, end } = slotRangeToInstants({ start: 0, end: 0 }, WINDOW);
    expect(start.toISOString()).toBe("2026-10-12T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-12T00:15:00.000Z");
  });

  it("ends at the close of the last selected slot, including later days", () => {
    // 56 slots per day: slot 56 is day 2, 08:00. Slots 64..67 are 10:00-11:00.
    const { start, end } = slotRangeToInstants({ start: 64, end: 67 }, WINDOW);
    expect(start.toISOString()).toBe("2026-10-13T02:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-13T03:00:00.000Z");
  });
});

describe("summarizeRangeAvailability", () => {
  const participants = [
    { availableSlots: [1, 2, 3], ifNeededSlots: [] },
    { availableSlots: [1, 2], ifNeededSlots: [3] },
    { availableSlots: [1], ifNeededSlots: [] },
  ];

  it("counts who is free for every slot and who needs an if-needed slot", () => {
    expect(summarizeRangeAvailability(participants, { start: 1, end: 3 })).toEqual({
      free: 1,
      maybe: 1,
      total: 3,
    });
  });

  it("treats a single slot as a one-slot range", () => {
    expect(summarizeRangeAvailability(participants, { start: 1, end: 1 })).toEqual({
      free: 3,
      maybe: 0,
      total: 3,
    });
  });
});
