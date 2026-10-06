import { afterEach, describe, expect, it } from "vitest";

import {
  assertIsoDate,
  availabilityToRanges,
  formatHhmm,
  formatSgtIso,
  parseHhmm,
  type PollGrid,
  pollDays,
  rangeToSlotIndices,
  slotIndicesToRanges,
  slotIndexToTime,
  slotsPerDay,
  slotStartUtcMs,
  SlotTimeError,
  toPollGrid,
  totalSlots,
  weekdayLabel,
  weekdayOf,
} from "./slot-time";

const IS215: PollGrid = {
  startDate: "2026-10-12",
  endDate: "2026-10-16",
  startHour: 8,
  endHour: 22,
  slotMinutes: 15,
};

const HACK: PollGrid = {
  startDate: "2026-10-24",
  endDate: "2026-10-28",
  startHour: 12,
  endHour: 22,
  slotMinutes: 30,
};

describe("toPollGrid", () => {
  it("maps @db.Date values to ISO days", () => {
    expect(
      toPollGrid({
        startDate: new Date("2026-10-12T00:00:00.000Z"),
        endDate: new Date("2026-10-16T00:00:00.000Z"),
        startHour: 8,
        endHour: 22,
        slotDurationMinutes: 15,
      }),
    ).toEqual(IS215);
  });
});

describe("slotsPerDay and totalSlots", () => {
  it("computes per-day and total slots for standard and hackathon grids", () => {
    expect(slotsPerDay(IS215)).toBe(56);
    expect(totalSlots(IS215)).toBe(280);

    expect(slotsPerDay(HACK)).toBe(20);
    expect(totalSlots(HACK)).toBe(100);
  });
});

describe("pollDays and weekdays", () => {
  it("lists every day with weekday labels", () => {
    expect(pollDays(IS215)).toEqual([
      { date: "2026-10-12", weekday: "Mon" },
      { date: "2026-10-13", weekday: "Tue" },
      { date: "2026-10-14", weekday: "Wed" },
      { date: "2026-10-15", weekday: "Thu" },
      { date: "2026-10-16", weekday: "Fri" },
    ]);
  });

  it("determines weekday of ISO dates", () => {
    expect(weekdayOf("2026-10-10")).toBe("sat");
    expect(weekdayOf("2026-10-11")).toBe("sun");
    expect(weekdayOf("2026-10-06")).toBe("tue");
  });

  it("labels weekdays correctly", () => {
    expect(weekdayLabel("sat")).toBe("Sat");
    expect(weekdayLabel("mon")).toBe("Mon");
  });
});

describe("assertIsoDate", () => {
  it("accepts valid ISO dates", () => {
    expect(() => assertIsoDate("2026-10-12")).not.toThrow();
  });

  it("rejects non-existent calendar dates and malformed strings", () => {
    expect(() => assertIsoDate("2026-02-30")).toThrow(SlotTimeError);
    expect(() => assertIsoDate("2026-02-30")).toThrow(
      'Invalid date "2026-02-30"; use YYYY-MM-DD.',
    );
    expect(() => assertIsoDate("not-a-date")).toThrow(
      'Invalid date "not-a-date"; use YYYY-MM-DD.',
    );
    expect(() => assertIsoDate("2026-1-1")).toThrow(
      'Invalid date "2026-1-1"; use YYYY-MM-DD.',
    );
  });
});

describe("parseHhmm and formatHhmm", () => {
  it("parses valid 24-hour time strings", () => {
    expect(parseHhmm("08:15")).toBe(495);
    expect(parseHhmm("24:00")).toBe(1440);
  });

  it("formats minute offsets back to HH:MM", () => {
    expect(formatHhmm(495)).toBe("08:15");
    expect(formatHhmm(1440)).toBe("24:00");
  });

  it("rejects invalid time formats", () => {
    expect(() => parseHhmm("8:15")).toThrow(
      'Invalid time "8:15"; use HH:MM (24-hour, SGT).',
    );
    expect(() => parseHhmm("24:15")).toThrow(
      'Invalid time "24:15"; use HH:MM (24-hour, SGT).',
    );
    expect(() => parseHhmm("10:60")).toThrow(
      'Invalid time "10:60"; use HH:MM (24-hour, SGT).',
    );
  });
});

describe("slotIndexToTime", () => {
  it("converts 15-minute slot indices accurately", () => {
    expect(slotIndexToTime(IS215, 0)).toEqual({
      date: "2026-10-12",
      start: "08:00",
      end: "08:15",
    });
    expect(slotIndexToTime(IS215, 64)).toEqual({
      date: "2026-10-13",
      start: "10:00",
      end: "10:15",
    });
    expect(slotIndexToTime(IS215, 279)).toEqual({
      date: "2026-10-16",
      start: "21:45",
      end: "22:00",
    });
  });

  it("converts 30-minute slot indices accurately", () => {
    expect(slotIndexToTime(HACK, 21)).toEqual({
      date: "2026-10-25",
      start: "12:30",
      end: "13:00",
    });
  });

  it("throws on indices out of bounds or non-integers", () => {
    expect(() => slotIndexToTime(IS215, 280)).toThrow(
      "Slot 280 is outside this poll.",
    );
    expect(() => slotIndexToTime(IS215, -1)).toThrow(
      "Slot -1 is outside this poll.",
    );
    expect(() => slotIndexToTime(IS215, 1.5)).toThrow(
      "Slot 1.5 is outside this poll.",
    );
  });
});

describe("rangeToSlotIndices", () => {
  it("maps valid ranges to ascending slot indices", () => {
    expect(
      rangeToSlotIndices(IS215, {
        date: "2026-10-13",
        start: "10:00",
        end: "11:00",
      }),
    ).toEqual([64, 65, 66, 67]);

    expect(
      rangeToSlotIndices(IS215, {
        date: "2026-10-16",
        start: "21:00",
        end: "22:00",
      }),
    ).toEqual([276, 277, 278, 279]);

    expect(
      rangeToSlotIndices(HACK, {
        date: "2026-10-25",
        start: "12:30",
        end: "14:00",
      }),
    ).toEqual([21, 22, 23]);
  });

  it("round-trips single slot ranges for all slots in the grid", () => {
    for (let i = 0; i < 280; i++) {
      expect(rangeToSlotIndices(IS215, slotIndexToTime(IS215, i))).toEqual([i]);
    }
    for (let i = 0; i < 100; i++) {
      expect(rangeToSlotIndices(HACK, slotIndexToTime(HACK, i))).toEqual([i]);
    }
  });

  it("rejects invalid ranges with specific error messages", () => {
    expect(() =>
      rangeToSlotIndices(IS215, {
        date: "2026-10-13",
        start: "10:10",
        end: "11:00",
      }),
    ).toThrow("Time 10:10 on 2026-10-13 is not on a 15-minute boundary.");

    expect(() =>
      rangeToSlotIndices(HACK, {
        date: "2026-10-25",
        start: "12:15",
        end: "13:00",
      }),
    ).toThrow("Time 12:15 on 2026-10-25 is not on a 30-minute boundary.");

    expect(() =>
      rangeToSlotIndices(IS215, {
        date: "2026-10-17",
        start: "10:00",
        end: "11:00",
      }),
    ).toThrow(
      "Date 2026-10-17 is outside the poll window 2026-10-12 to 2026-10-16.",
    );

    expect(() =>
      rangeToSlotIndices(IS215, {
        date: "2026-10-13",
        start: "07:00",
        end: "08:00",
      }),
    ).toThrow(
      "Time 07:00-08:00 on 2026-10-13 is outside the poll hours 08:00-22:00 SGT.",
    );

    expect(() =>
      rangeToSlotIndices(IS215, {
        date: "2026-10-13",
        start: "11:00",
        end: "10:00",
      }),
    ).toThrow("Range 11:00-10:00 on 2026-10-13 must end after it starts.");

    expect(() =>
      rangeToSlotIndices(IS215, {
        date: "2026-10-13",
        start: "10:00",
        end: "10:00",
      }),
    ).toThrow("Range 10:00-10:00 on 2026-10-13 must end after it starts.");

    expect(() =>
      rangeToSlotIndices(IS215, {
        date: "2026-02-30",
        start: "10:00",
        end: "11:00",
      }),
    ).toThrow('Invalid date "2026-02-30"; use YYYY-MM-DD.');
  });
});

describe("slotIndicesToRanges", () => {
  it("merges runs and splits at day boundaries, dropping out-of-bounds indices", () => {
    expect(
      slotIndicesToRanges(IS215, [0, 1, 2, 3, 8, 9, 55, 56, 280, -1]),
    ).toEqual([
      { date: "2026-10-12", start: "08:00", end: "09:00" },
      { date: "2026-10-12", start: "10:00", end: "10:30" },
      { date: "2026-10-12", start: "21:45", end: "22:00" },
      { date: "2026-10-13", start: "08:00", end: "08:15" },
    ]);
  });
});

describe("availabilityToRanges", () => {
  it("sorts by time and lets available win over ifNeeded", () => {
    expect(
      availabilityToRanges(IS215, {
        availableSlots: [0, 1, 2, 3, 64],
        ifNeededSlots: [4, 5, 64],
      }),
    ).toEqual([
      {
        date: "2026-10-12",
        start: "08:00",
        end: "09:00",
        status: "available",
      },
      {
        date: "2026-10-12",
        start: "09:00",
        end: "09:30",
        status: "ifNeeded",
      },
      {
        date: "2026-10-13",
        start: "10:00",
        end: "10:15",
        status: "available",
      },
    ]);
  });
});

describe("slotStartUtcMs", () => {
  it("computes exact UTC epoch ms for slots", () => {
    expect(new Date(slotStartUtcMs(IS215, 0)).toISOString()).toBe(
      "2026-10-12T00:00:00.000Z",
    );
    expect(new Date(slotStartUtcMs(IS215, 64)).toISOString()).toBe(
      "2026-10-13T02:00:00.000Z",
    );
  });
});

describe("formatSgtIso", () => {
  it("formats Date to Singapore ISO string", () => {
    expect(formatSgtIso(new Date("2026-10-06T11:30:00.000Z"))).toBe(
      "2026-10-06T19:30:00+08:00",
    );
    expect(formatSgtIso(new Date("2026-10-06T16:30:00.000Z"))).toBe(
      "2026-10-07T00:30:00+08:00",
    );
  });
});

describe("host TZ independence", () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    if (originalTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTz;
    }
  });

  it.each([
    "UTC",
    "Asia/Singapore",
    "America/Los_Angeles",
    "Pacific/Kiritimati",
  ])("behaves identically across timezone %s", (tz) => {
    process.env.TZ = tz;

    expect(
      toPollGrid({
        startDate: new Date("2026-10-12T00:00:00.000Z"),
        endDate: new Date("2026-10-16T00:00:00.000Z"),
        startHour: 8,
        endHour: 22,
        slotDurationMinutes: 15,
      }),
    ).toEqual(IS215);

    expect(pollDays(IS215).map((d) => d.weekday)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
    ]);

    expect(slotIndexToTime(IS215, 64)).toEqual({
      date: "2026-10-13",
      start: "10:00",
      end: "10:15",
    });

    expect(slotStartUtcMs(IS215, 64)).toBe(
      Date.parse("2026-10-13T02:00:00.000Z"),
    );

    expect(formatSgtIso(new Date("2026-10-06T11:30:00.000Z"))).toBe(
      "2026-10-06T19:30:00+08:00",
    );
    expect(formatSgtIso(new Date("2026-10-06T16:30:00.000Z"))).toBe(
      "2026-10-07T00:30:00+08:00",
    );
  });
});
