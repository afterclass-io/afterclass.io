import { afterEach, describe, expect, it } from "vitest";

import { type PollGrid, SlotTimeError } from "./slot-time";
import {
  DEFAULT_SUGGESTION_LIMIT,
  describeAttendance,
  disambiguateNames,
  MAX_DURATION_MINUTES,
  MAX_SUGGESTION_LIMIT,
  type SuggestParticipant,
  type SuggestQuery,
  suggestMeetingTimes,
} from "./suggest-times";

function grid(
  startDate: string,
  endDate: string,
  startHour: number,
  endHour: number,
  slotMinutes = 15,
): PollGrid {
  return { startDate, endDate, startHour, endHour, slotMinutes };
}

const EARLY = new Date("2026-10-01T00:00:00.000Z");

function p(
  name: string,
  available: readonly number[],
  ifNeeded: readonly number[] = [],
): SuggestParticipant {
  return { name, availableSlots: available, ifNeededSlots: ifNeeded };
}

function range(a: number, b: number): number[] {
  const result: number[] = [];
  for (let i = a; i <= b; i++) {
    result.push(i);
  }
  return result;
}

const IS215_PARTICIPANTS: SuggestParticipant[] = [
  p("Jordan Teo", [0, 1, 2, 3, 8, 9, 10, 11], [4, 5, 12, 13]),
  p("Alice Tan", [0, 1, 8, 9, 16, 17], [2, 3, 10, 11]),
  p("Ben Lim", [0, 1, 2, 8, 9, 10, 16, 17], [3, 11]),
  p("Chloe Ong", [8, 9, 10, 11, 16, 17], [0, 1]),
];

describe("suggest-times constants", () => {
  it("exports expected defaults and limits", () => {
    expect(MAX_DURATION_MINUTES).toBe(480);
    expect(DEFAULT_SUGGESTION_LIMIT).toBe(5);
    expect(MAX_SUGGESTION_LIMIT).toBe(10);
  });
});

describe("describeAttendance", () => {
  it("describes attendance counts and names", () => {
    expect(
      describeAttendance({ free: [], ifNeeded: [], unavailable: [] }),
    ).toEqual({ tier: "none", summary: "No participants" });

    expect(
      describeAttendance({ free: [], ifNeeded: [], unavailable: ["A", "B"] }),
    ).toEqual({ tier: "none", summary: "Nobody can attend" });

    expect(
      describeAttendance({ free: ["A", "B"], ifNeeded: [], unavailable: [] }),
    ).toEqual({ tier: "everyone-free", summary: "All 2 free" });

    expect(
      describeAttendance({ free: ["A"], ifNeeded: ["B"], unavailable: [] }),
    ).toEqual({
      tier: "everyone-attendable",
      summary: "All 2 can attend: 1 free, 1 if needed",
    });

    expect(
      describeAttendance({
        free: ["A"],
        ifNeeded: [],
        unavailable: ["Ben Lim"],
      }),
    ).toEqual({
      tier: "partial",
      summary: "1 of 2 can attend: 1 free, 0 if needed; unavailable: Ben Lim",
    });
  });
});

describe("disambiguateNames", () => {
  it("10. duplicate names get numeric suffixes", () => {
    expect(disambiguateNames(["Student", "Student", "Alice Tan"])).toEqual([
      "Student",
      "Student 2",
      "Alice Tan",
    ]);

    expect(disambiguateNames(["Student", "Student", "Student 2"])).toEqual([
      "Student",
      "Student 3",
      "Student 2",
    ]);
  });
});

describe("suggestMeetingTimes", () => {
  it("1. ranks by attendable, then free, then earliest (worked example)", () => {
    const result = suggestMeetingTimes({
      grid: grid("2026-10-12", "2026-10-12", 10, 12),
      participants: [
        p("A", range(0, 7)),
        p("B", range(4, 7), range(0, 3)),
        p("C", [], range(0, 7)),
      ],
      query: { durationMinutes: 60 },
      now: EARLY,
    });

    expect(result.options).toEqual([
      {
        date: "2026-10-12",
        weekday: "Mon",
        start: "11:00",
        end: "12:00",
        startRange: { earliest: "11:00", latest: "11:00" },
        free: ["A", "B"],
        ifNeeded: ["C"],
        unavailable: [],
        attendable: 3,
        total: 3,
        tier: "everyone-attendable",
        summary: "All 3 can attend: 2 free, 1 if needed",
      },
      {
        date: "2026-10-12",
        weekday: "Mon",
        start: "10:00",
        end: "11:00",
        startRange: { earliest: "10:00", latest: "10:45" },
        free: ["A"],
        ifNeeded: ["B", "C"],
        unavailable: [],
        attendable: 3,
        total: 3,
        tier: "everyone-attendable",
        summary: "All 3 can attend: 1 free, 2 if needed",
      },
    ]);
    expect(result.nobodyCanAttend).toBe(false);
    expect(result.emptyReason).toBeNull();
  });

  it("2. a duration longer than a free run makes that participant unavailable", () => {
    const result = suggestMeetingTimes({
      grid: grid("2026-10-12", "2026-10-12", 10, 12),
      participants: [p("A", [0, 1, 2]), p("B", range(0, 3))],
      query: { durationMinutes: 60 },
      now: EARLY,
    });

    expect(result.options).toEqual([
      {
        date: "2026-10-12",
        weekday: "Mon",
        start: "10:00",
        end: "11:00",
        startRange: { earliest: "10:00", latest: "10:00" },
        free: ["B"],
        ifNeeded: [],
        unavailable: ["A"],
        attendable: 1,
        total: 2,
        tier: "partial",
        summary: "1 of 2 can attend: 1 free, 0 if needed; unavailable: A",
      },
    ]);
  });

  it("3. a block never spans two days", () => {
    const result = suggestMeetingTimes({
      grid: grid("2026-10-12", "2026-10-13", 10, 12),
      participants: [p("A", [6, 7, 8, 9])],
      query: { durationMinutes: 60 },
      now: EARLY,
    });

    expect(result.nobodyCanAttend).toBe(true);
    expect(result.options).toEqual([
      {
        date: "2026-10-12",
        weekday: "Mon",
        start: "10:00",
        end: "11:00",
        startRange: { earliest: "10:00", latest: "11:00" },
        free: [],
        ifNeeded: [],
        unavailable: ["A"],
        attendable: 0,
        total: 1,
        tier: "none",
        summary: "Nobody can attend",
      },
      {
        date: "2026-10-13",
        weekday: "Tue",
        start: "10:00",
        end: "11:00",
        startRange: { earliest: "10:00", latest: "11:00" },
        free: [],
        ifNeeded: [],
        unavailable: ["A"],
        attendable: 0,
        total: 1,
        tier: "none",
        summary: "Nobody can attend",
      },
    ]);
    expect(result.bestPerDay.map((o) => o.date)).toEqual([
      "2026-10-12",
      "2026-10-13",
    ]);
  });

  it("4. weekend filter returns only Sat/Sun even when weekdays score higher", () => {
    const result = suggestMeetingTimes({
      grid: grid("2026-10-09", "2026-10-12", 10, 12),
      participants: [
        p("A", [...range(0, 7), ...range(8, 11), ...range(24, 31)]),
        p("B", [...range(0, 7), ...range(24, 31)]),
      ],
      query: { daysOfWeek: ["sat", "sun"], durationMinutes: 60 },
      now: EARLY,
    });

    expect(result.options).toEqual([
      {
        date: "2026-10-10",
        weekday: "Sat",
        start: "10:00",
        end: "11:00",
        startRange: { earliest: "10:00", latest: "10:00" },
        free: ["A"],
        ifNeeded: [],
        unavailable: ["B"],
        attendable: 1,
        total: 2,
        tier: "partial",
        summary: "1 of 2 can attend: 1 free, 0 if needed; unavailable: B",
      },
    ]);
    expect(result.bestPerDay).toEqual([
      result.options[0],
      {
        date: "2026-10-11",
        weekday: "Sun",
        start: "10:00",
        end: "11:00",
        startRange: { earliest: "10:00", latest: "11:00" },
        free: [],
        ifNeeded: [],
        unavailable: ["A", "B"],
        attendable: 0,
        total: 2,
        tier: "none",
        summary: "Nobody can attend",
      },
    ]);
  });

  it("5. bestPerDay includes a low-scoring day outside the top options", () => {
    const result = suggestMeetingTimes({
      grid: grid("2026-10-12", "2026-10-13", 10, 12),
      participants: [
        p("A", range(0, 7)),
        p("B", range(0, 7)),
        p("C", [...range(0, 3), ...range(8, 11)]),
      ],
      query: { limit: 1, durationMinutes: 60 },
      now: EARLY,
    });

    expect(result.options).toEqual([
      {
        date: "2026-10-12",
        weekday: "Mon",
        start: "10:00",
        end: "11:00",
        startRange: { earliest: "10:00", latest: "10:00" },
        free: ["A", "B", "C"],
        ifNeeded: [],
        unavailable: [],
        attendable: 3,
        total: 3,
        tier: "everyone-free",
        summary: "All 3 free",
      },
    ]);
    expect(result.bestPerDay[1]).toEqual({
      date: "2026-10-13",
      weekday: "Tue",
      start: "10:00",
      end: "11:00",
      startRange: { earliest: "10:00", latest: "10:00" },
      free: ["C"],
      ifNeeded: [],
      unavailable: ["A", "B"],
      attendable: 1,
      total: 3,
      tier: "partial",
      summary: "1 of 3 can attend: 1 free, 0 if needed; unavailable: A, B",
    });
  });

  it("6. overlapping starts with the same attendees collapse into startRange", () => {
    const result = suggestMeetingTimes({
      grid: grid("2026-10-12", "2026-10-12", 8, 12),
      participants: [p("A", range(0, 7))],
      query: { durationMinutes: 60 },
      now: EARLY,
    });

    expect(result.options).toHaveLength(1);
    expect(result.options[0]).toEqual({
      date: "2026-10-12",
      weekday: "Mon",
      start: "08:00",
      end: "09:00",
      startRange: { earliest: "08:00", latest: "09:00" },
      free: ["A"],
      ifNeeded: [],
      unavailable: [],
      attendable: 1,
      total: 1,
      tier: "everyone-free",
      summary: "All 1 free",
    });
  });

  it("7. requireParticipants prefers options the named people can attend, and falls back to the closest", () => {
    const participants = [
      p("A", range(0, 3)),
      p("B", range(4, 7)),
      p("C", range(0, 7)),
    ];

    const withB = suggestMeetingTimes({
      grid: grid("2026-10-12", "2026-10-12", 10, 12),
      participants,
      query: { requireParticipants: ["  b "], durationMinutes: 60 },
      now: EARLY,
    });
    expect(withB.options).toEqual([
      {
        date: "2026-10-12",
        weekday: "Mon",
        start: "11:00",
        end: "12:00",
        startRange: { earliest: "11:00", latest: "11:00" },
        free: ["B", "C"],
        ifNeeded: [],
        unavailable: ["A"],
        attendable: 2,
        total: 3,
        tier: "partial",
        summary: "2 of 3 can attend: 2 free, 0 if needed; unavailable: A",
      },
    ]);
    expect(withB.requiredUnmet).toBe(false);

    const withAB = suggestMeetingTimes({
      grid: grid("2026-10-12", "2026-10-12", 10, 12),
      participants,
      query: { requireParticipants: ["A", "B"], durationMinutes: 60 },
      now: EARLY,
    });
    expect(withAB.requiredUnmet).toBe(true);
    expect(withAB.emptyReason).toBeNull();
    expect(withAB.nobodyCanAttend).toBe(false);
    expect(withAB.options).toEqual([
      {
        date: "2026-10-12",
        weekday: "Mon",
        start: "10:00",
        end: "11:00",
        startRange: { earliest: "10:00", latest: "10:00" },
        free: ["A", "C"],
        ifNeeded: [],
        unavailable: ["B"],
        attendable: 2,
        total: 3,
        tier: "partial",
        summary: "2 of 3 can attend: 2 free, 0 if needed; unavailable: B",
      },
      {
        date: "2026-10-12",
        weekday: "Mon",
        start: "11:00",
        end: "12:00",
        startRange: { earliest: "11:00", latest: "11:00" },
        free: ["B", "C"],
        ifNeeded: [],
        unavailable: ["A"],
        attendable: 2,
        total: 3,
        tier: "partial",
        summary: "2 of 3 can attend: 2 free, 0 if needed; unavailable: A",
      },
      {
        date: "2026-10-12",
        weekday: "Mon",
        start: "10:15",
        end: "11:15",
        startRange: { earliest: "10:15", latest: "10:45" },
        free: ["C"],
        ifNeeded: [],
        unavailable: ["A", "B"],
        attendable: 1,
        total: 3,
        tier: "partial",
        summary: "1 of 3 can attend: 1 free, 0 if needed; unavailable: A, B",
      },
    ]);

    expect(() =>
      suggestMeetingTimes({
        grid: grid("2026-10-12", "2026-10-12", 10, 12),
        participants,
        query: { requireParticipants: ["Zed"], durationMinutes: 60 },
        now: EARLY,
      }),
    ).toThrowError(
      new SlotTimeError(
        "Unknown participant name(s): Zed. Participants: A, B, C.",
      ),
    );
  });

  it("8. skips blocks that start before now", () => {
    const participants = [p("A", range(0, 7))];
    const g = grid("2026-10-12", "2026-10-12", 10, 12);

    const partialPast = suggestMeetingTimes({
      grid: g,
      participants,
      query: { durationMinutes: 60 },
      now: new Date("2026-10-12T02:30:00.000Z"),
    });
    expect(partialPast.options[0]?.start).toBe("10:30");
    expect(partialPast.options[0]?.startRange).toEqual({
      earliest: "10:30",
      latest: "11:00",
    });

    const allPast = suggestMeetingTimes({
      grid: g,
      participants,
      query: { durationMinutes: 60 },
      now: new Date("2026-10-12T04:00:00.000Z"),
    });
    expect(allPast).toEqual({
      options: [],
      bestPerDay: [],
      nobodyCanAttend: true,
      requiredUnmet: false,
      emptyReason: "all-past",
      participants: { total: 1, noResponse: [] },
    });

    const includePast = suggestMeetingTimes({
      grid: g,
      participants,
      query: { includePast: true, durationMinutes: 60 },
      now: new Date("2026-10-12T04:00:00.000Z"),
    });
    expect(includePast.options[0]?.startRange).toEqual({
      earliest: "10:00",
      latest: "11:00",
    });
  });

  it("9. an all-unavailable window still returns options", () => {
    const result = suggestMeetingTimes({
      grid: grid("2026-10-12", "2026-10-12", 10, 12),
      participants: [p("A", []), p("B", [])],
      query: { durationMinutes: 60 },
      now: EARLY,
    });

    expect(result.options).toEqual([
      {
        date: "2026-10-12",
        weekday: "Mon",
        start: "10:00",
        end: "11:00",
        startRange: { earliest: "10:00", latest: "11:00" },
        free: [],
        ifNeeded: [],
        unavailable: ["A", "B"],
        attendable: 0,
        total: 2,
        tier: "none",
        summary: "Nobody can attend",
      },
    ]);
    expect(result.nobodyCanAttend).toBe(true);
    expect(result.emptyReason).toBeNull();
    expect(result.participants).toEqual({
      total: 2,
      noResponse: ["A", "B"],
    });
  });

  it("10b. disambiguated participant names propagate to noResponse", () => {
    const result = suggestMeetingTimes({
      grid: grid("2026-10-12", "2026-10-12", 10, 12),
      participants: [p("Student", []), p("Student", [])],
      query: { durationMinutes: 60 },
      now: EARLY,
    });

    expect(result.participants.noResponse).toEqual(["Student", "Student 2"]);
  });

  it("11. 30-minute poll", () => {
    const result = suggestMeetingTimes({
      grid: grid("2026-10-24", "2026-10-24", 12, 22, 30),
      participants: [p("A", [0, 1, 2, 8, 9], [3, 10])],
      query: { durationMinutes: 60 },
      now: EARLY,
    });

    expect(
      result.options.map((o) => [
        o.start,
        o.end,
        o.startRange?.latest,
        o.free.length,
      ]),
    ).toEqual([
      ["12:00", "13:00", "12:30", 1],
      ["16:00", "17:00", "16:00", 1],
      ["13:00", "14:00", "13:00", 0],
      ["16:30", "17:30", "16:30", 0],
    ]);

    expect(() =>
      suggestMeetingTimes({
        grid: grid("2026-10-24", "2026-10-24", 12, 22, 30),
        participants: [p("A", [0, 1, 2, 8, 9], [3, 10])],
        query: { durationMinutes: 45 },
        now: EARLY,
      }),
    ).toThrowError(
      new SlotTimeError(
        "durationMinutes must be a multiple of 30 for this poll.",
      ),
    );
  });

  it("12. earliestStart/latestEnd round onto the grid", () => {
    const result = suggestMeetingTimes({
      grid: grid("2026-10-12", "2026-10-12", 18, 22),
      participants: [p("A", range(0, 15))],
      query: { earliestStart: "18:10", latestEnd: "21:50", durationMinutes: 60 },
      now: EARLY,
    });

    expect(result.options[0]?.startRange).toEqual({
      earliest: "18:15",
      latest: "20:45",
    });
  });

  it("13. from/to is clipped to the poll window", () => {
    const result = suggestMeetingTimes({
      grid: grid("2026-10-12", "2026-10-13", 10, 12),
      participants: [p("A", range(0, 15))],
      query: { from: "2026-10-01", to: "2026-10-12", durationMinutes: 60 },
      now: EARLY,
    });

    expect(result.bestPerDay.map((o) => o.date)).toEqual(["2026-10-12"]);
  });

  describe("14. validation errors", () => {
    const baseGrid = grid("2026-10-12", "2026-10-13", 10, 12);
    const participants = [p("A", range(0, 15))];

    it.each([
      [
        { dates: ["2026-10-20"] },
        "Date 2026-10-20 is outside the poll window 2026-10-12 to 2026-10-13.",
      ],
      [
        { dates: ["2026-10-12"], from: "2026-10-12" },
        "Pass either dates or from/to, not both.",
      ],
      [
        { from: "2026-10-13", to: "2026-10-12" },
        "from must be on or before to.",
      ],
      [
        { daysOfWeek: ["sat" as const] },
        "No poll days match the requested dates/days. The poll runs 2026-10-12 (Mon) to 2026-10-13 (Tue).",
      ],
      [
        { earliestStart: "11:30", durationMinutes: 60 },
        "A 60-minute meeting does not fit between 11:30 and 12:00 SGT.",
      ],
      [
        { earliestStart: "12:00", latestEnd: "11:00" },
        "earliestStart must be before latestEnd.",
      ],
      [
        { durationMinutes: 600 },
        "durationMinutes must be at most 480.",
      ],
      [
        { limit: 11 },
        "limit must be between 1 and 10.",
      ],
    ])(
      "rejects invalid query %j with error %s",
      (query: SuggestQuery, expectedError: string) => {
        expect(() =>
          suggestMeetingTimes({
            grid: baseGrid,
            participants,
            query,
            now: EARLY,
          }),
        ).toThrowError(new SlotTimeError(expectedError));
      },
    );
  });

  describe("15. does not depend on host TZ", () => {
    const originalTz = process.env.TZ;

    afterEach(() => {
      if (originalTz === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTz;
      }
    });

    it.each(["America/Los_Angeles", "Pacific/Kiritimati"])(
      "gives identical output across timezone %s",
      (tz) => {
        process.env.TZ = tz;

        const result = suggestMeetingTimes({
          grid: grid("2026-10-12", "2026-10-12", 10, 12),
          participants: [
            p("A", range(0, 7)),
            p("B", range(4, 7), range(0, 3)),
            p("C", [], range(0, 7)),
          ],
          query: { durationMinutes: 60 },
          now: EARLY,
        });

        expect(result.options).toEqual([
          {
            date: "2026-10-12",
            weekday: "Mon",
            start: "11:00",
            end: "12:00",
            startRange: { earliest: "11:00", latest: "11:00" },
            free: ["A", "B"],
            ifNeeded: ["C"],
            unavailable: [],
            attendable: 3,
            total: 3,
            tier: "everyone-attendable",
            summary: "All 3 can attend: 2 free, 1 if needed",
          },
          {
            date: "2026-10-12",
            weekday: "Mon",
            start: "10:00",
            end: "11:00",
            startRange: { earliest: "10:00", latest: "10:45" },
            free: ["A"],
            ifNeeded: ["B", "C"],
            unavailable: [],
            attendable: 3,
            total: 3,
            tier: "everyone-attendable",
            summary: "All 3 can attend: 1 free, 2 if needed",
          },
        ]);
        expect(result.nobodyCanAttend).toBe(false);
        expect(result.emptyReason).toBeNull();
      },
    );
  });

  describe("window mode (Task 8 new tests)", () => {
    it("window mode: IS215 whole poll, no duration", () => {
      const result = suggestMeetingTimes({
        grid: grid("2026-10-12", "2026-10-16", 8, 22, 15),
        participants: IS215_PARTICIPANTS,
        query: {},
        now: EARLY,
      });

      expect(result.nobodyCanAttend).toBe(false);
      expect(result.options).toEqual([
        {
          date: "2026-10-12",
          weekday: "Mon",
          start: "10:00",
          end: "10:30",
          free: ["Jordan Teo", "Alice Tan", "Ben Lim", "Chloe Ong"],
          ifNeeded: [],
          unavailable: [],
          attendable: 4,
          total: 4,
          tier: "everyone-free",
          summary: "All 4 free",
        },
        {
          date: "2026-10-12",
          weekday: "Mon",
          start: "08:00",
          end: "08:30",
          free: ["Jordan Teo", "Alice Tan", "Ben Lim"],
          ifNeeded: ["Chloe Ong"],
          unavailable: [],
          attendable: 4,
          total: 4,
          tier: "everyone-attendable",
          summary: "All 4 can attend: 3 free, 1 if needed",
        },
        {
          date: "2026-10-12",
          weekday: "Mon",
          start: "10:30",
          end: "10:45",
          free: ["Jordan Teo", "Ben Lim", "Chloe Ong"],
          ifNeeded: ["Alice Tan"],
          unavailable: [],
          attendable: 4,
          total: 4,
          tier: "everyone-attendable",
          summary: "All 4 can attend: 3 free, 1 if needed",
        },
        {
          date: "2026-10-12",
          weekday: "Mon",
          start: "10:45",
          end: "11:00",
          free: ["Jordan Teo", "Chloe Ong"],
          ifNeeded: ["Alice Tan", "Ben Lim"],
          unavailable: [],
          attendable: 4,
          total: 4,
          tier: "everyone-attendable",
          summary: "All 4 can attend: 2 free, 2 if needed",
        },
        {
          date: "2026-10-12",
          weekday: "Mon",
          start: "12:00",
          end: "12:30",
          free: ["Alice Tan", "Ben Lim", "Chloe Ong"],
          ifNeeded: [],
          unavailable: ["Jordan Teo"],
          attendable: 3,
          total: 4,
          tier: "partial",
          summary:
            "3 of 4 can attend: 3 free, 0 if needed; unavailable: Jordan Teo",
        },
      ]);

      for (const opt of result.options) {
        expect("startRange" in opt).toBe(false);
      }

      expect(result.bestPerDay).toHaveLength(5);
      expect(result.bestPerDay[0]).toEqual(result.options[0]);
      expect(result.bestPerDay.slice(1)).toEqual([
        {
          date: "2026-10-13",
          weekday: "Tue",
          start: "08:00",
          end: "22:00",
          free: [],
          ifNeeded: [],
          unavailable: ["Jordan Teo", "Alice Tan", "Ben Lim", "Chloe Ong"],
          attendable: 0,
          total: 4,
          tier: "none",
          summary: "Nobody can attend",
        },
        {
          date: "2026-10-14",
          weekday: "Wed",
          start: "08:00",
          end: "22:00",
          free: [],
          ifNeeded: [],
          unavailable: ["Jordan Teo", "Alice Tan", "Ben Lim", "Chloe Ong"],
          attendable: 0,
          total: 4,
          tier: "none",
          summary: "Nobody can attend",
        },
        {
          date: "2026-10-15",
          weekday: "Thu",
          start: "08:00",
          end: "22:00",
          free: [],
          ifNeeded: [],
          unavailable: ["Jordan Teo", "Alice Tan", "Ben Lim", "Chloe Ong"],
          attendable: 0,
          total: 4,
          tier: "none",
          summary: "Nobody can attend",
        },
        {
          date: "2026-10-16",
          weekday: "Fri",
          start: "08:00",
          end: "22:00",
          free: [],
          ifNeeded: [],
          unavailable: ["Jordan Teo", "Alice Tan", "Ben Lim", "Chloe Ong"],
          attendable: 0,
          total: 4,
          tier: "none",
          summary: "Nobody can attend",
        },
      ]);
    });

    it("window mode: Monday 08:00-10:00", () => {
      const result = suggestMeetingTimes({
        grid: grid("2026-10-12", "2026-10-16", 8, 22, 15),
        participants: IS215_PARTICIPANTS,
        query: {
          dates: ["2026-10-12"],
          earliestStart: "08:00",
          latestEnd: "10:00",
        },
        now: EARLY,
      });

      expect(result.options).toEqual([
        {
          date: "2026-10-12",
          weekday: "Mon",
          start: "08:00",
          end: "08:30",
          free: ["Jordan Teo", "Alice Tan", "Ben Lim"],
          ifNeeded: ["Chloe Ong"],
          unavailable: [],
          attendable: 4,
          total: 4,
          tier: "everyone-attendable",
          summary: "All 4 can attend: 3 free, 1 if needed",
        },
        {
          date: "2026-10-12",
          weekday: "Mon",
          start: "08:30",
          end: "08:45",
          free: ["Jordan Teo", "Ben Lim"],
          ifNeeded: ["Alice Tan"],
          unavailable: ["Chloe Ong"],
          attendable: 3,
          total: 4,
          tier: "partial",
          summary:
            "3 of 4 can attend: 2 free, 1 if needed; unavailable: Chloe Ong",
        },
        {
          date: "2026-10-12",
          weekday: "Mon",
          start: "08:45",
          end: "09:00",
          free: ["Jordan Teo"],
          ifNeeded: ["Alice Tan", "Ben Lim"],
          unavailable: ["Chloe Ong"],
          attendable: 3,
          total: 4,
          tier: "partial",
          summary:
            "3 of 4 can attend: 1 free, 2 if needed; unavailable: Chloe Ong",
        },
        {
          date: "2026-10-12",
          weekday: "Mon",
          start: "09:00",
          end: "09:30",
          free: [],
          ifNeeded: ["Jordan Teo"],
          unavailable: ["Alice Tan", "Ben Lim", "Chloe Ong"],
          attendable: 1,
          total: 4,
          tier: "partial",
          summary:
            "1 of 4 can attend: 0 free, 1 if needed; unavailable: Alice Tan, Ben Lim, Chloe Ong",
        },
      ]);

      expect(result.bestPerDay).toEqual([result.options[0]]);
    });

    it("duration mode keeps startRange", () => {
      const result = suggestMeetingTimes({
        grid: grid("2026-10-12", "2026-10-16", 8, 22, 15),
        participants: IS215_PARTICIPANTS,
        query: { durationMinutes: 60, dates: ["2026-10-12"], limit: 1 },
        now: EARLY,
      });

      expect(result.options).toEqual([
        {
          date: "2026-10-12",
          weekday: "Mon",
          start: "10:00",
          end: "11:00",
          startRange: { earliest: "10:00", latest: "10:00" },
          free: ["Jordan Teo", "Chloe Ong"],
          ifNeeded: ["Alice Tan", "Ben Lim"],
          unavailable: [],
          attendable: 4,
          total: 4,
          tier: "everyone-attendable",
          summary: "All 4 can attend: 2 free, 2 if needed",
        },
      ]);
    });

    it("window mode merges identical consecutive slots", () => {
      const result = suggestMeetingTimes({
        grid: grid("2026-10-12", "2026-10-12", 10, 12, 15),
        participants: [p("A", range(0, 7))],
        query: {},
        now: EARLY,
      });

      expect(result.options).toEqual([
        {
          date: "2026-10-12",
          weekday: "Mon",
          start: "10:00",
          end: "12:00",
          free: ["A"],
          ifNeeded: [],
          unavailable: [],
          attendable: 1,
          total: 1,
          tier: "everyone-free",
          summary: "All 1 free",
        },
      ]);
      expect("startRange" in result.options[0]!).toBe(false);
    });

    it("window mode error", () => {
      expect(() =>
        suggestMeetingTimes({
          grid: grid("2026-10-12", "2026-10-12", 10, 12, 15),
          participants: [p("A", range(0, 7))],
          query: { earliestStart: "11:50" },
          now: EARLY,
        }),
      ).toThrowError(
        new SlotTimeError("No poll hours fall between 12:00 and 12:00 SGT."),
      );
    });
  });
});
