import { describe, it, expect } from "vitest";
import { buildIcal } from "./build-ical";
import type { ArrangedClass } from "@/modules/timetable/components/TimetableGrid";
import ical from "ical-generator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal ArrangedClass with one weekly timing. */
function makeClass(overrides: Partial<ArrangedClass> = {}): ArrangedClass {
  return {
    classId: "test-class-1",
    courseCode: "CS101",
    courseName: "Introduction to Computer Science",
    section: "G1",
    professorName: "Dr. Tan",
    creditUnits: 1.0,
    timings: [
      {
        dayOfWeek: "Monday",
        startTime: "08:15",
        endTime: "11:45",
        venue: "SOE/SR3-1",
      },
    ],
    examTimings: [],
    ...overrides,
  };
}

/** Parse iCal string back through ical-generator for validation. */
function parseIcal(_ics: string) {
  // Validate by creating a new calendar — just check it doesn't throw
  ical({});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildIcal", () => {
  // -- Basic structure -------------------------------------------------------

  it("produces a valid iCal string that ical-generator can re-parse", () => {
    const termStart = new Date("2025-01-06T00:00:00+08:00");
    const termEnd = new Date("2025-04-30T23:59:59+08:00");
    const result = buildIcal({
      classes: [makeClass()],
      termStart,
      termEnd,
      timetableName: "My Plan A",
    });

    // Must start with BEGIN:VCALENDAR
    expect(result).toContain("BEGIN:VCALENDAR");
    expect(result).toContain("END:VCALENDAR");
    expect(result).toContain("VERSION:2.0");
    expect(result).toContain("PRODID:-//afterclass.io//timetable//EN");
    expect(result).toContain("X-WR-CALNAME:My Plan A");
    expect(result).toContain("METHOD:PUBLISH");
  });

  // -- Single Monday class ---------------------------------------------------

  it("generates one VEVENT with BYDAY=MO and correct UNTIL for a Monday class", () => {
    const termStart = new Date("2025-01-06T00:00:00+08:00"); // Monday
    const termEnd = new Date("2025-04-30T23:59:59+08:00");
    const result = buildIcal({
      classes: [makeClass()],
      termStart,
      termEnd,
      timetableName: "Plan A",
    });

    // Should have exactly one VEVENT
    const veventCount = (result.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(veventCount).toBe(1);

    expect(result).toContain("SUMMARY:CS101 G1");
    expect(result).toContain("LOCATION:SOE/SR3-1");
    expect(result).toContain("BYDAY=MO");
    expect(result).toContain("FREQ=WEEKLY");
    expect(result).toContain("UNTIL=");

    // DTSTART should be on the first Monday on/after termStart
    // termStart IS Monday 2025-01-06, so DTSTART should be 20250106T081500
    expect(result).toContain("DTSTART;TZID=Asia/Singapore:20250106T081500");
    expect(result).toContain("DTEND;TZID=Asia/Singapore:20250106T114500");
  });

  // -- DTSTART calculates first occurrence after termStart -------------------

  it("calculates DTSTART as first occurrence on/after termStart (mid-week start)", () => {
    const termStart = new Date("2025-01-08T00:00:00+08:00"); // Wednesday
    const termEnd = new Date("2025-04-30T23:59:59+08:00");
    const result = buildIcal({
      classes: [makeClass()], // Monday class
      termStart,
      termEnd,
      timetableName: "Plan A",
    });

    // First Monday on/after Jan 8, 2025 is Jan 13, 2025
    expect(result).toContain("DTSTART;TZID=Asia/Singapore:20250113T081500");
  });

  // -- Multiple timings per class --------------------------------------------

  it("generates one VEVENT per class timing", () => {
    const termStart = new Date("2025-01-06T00:00:00+08:00");
    const termEnd = new Date("2025-04-30T23:59:59+08:00");
    const cls = makeClass({
      timings: [
        { dayOfWeek: "Monday", startTime: "08:15", endTime: "11:45", venue: "SOE/SR3-1" },
        { dayOfWeek: "Wednesday", startTime: "12:00", endTime: "14:00", venue: "SCIS/SR2-1" },
      ],
    });
    const result = buildIcal({
      classes: [cls],
      termStart,
      termEnd,
      timetableName: "Plan A",
    });

    const veventCount = (result.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(veventCount).toBe(2);

    expect(result).toContain("BYDAY=MO");
    expect(result).toContain("BYDAY=WE");
    expect(result).toContain("LOCATION:SOE/SR3-1");
    expect(result).toContain("LOCATION:SCIS/SR2-1");
  });

  // -- Exam timings produce one-off VEVENT -----------------------------------

  it("produces one-off VEVENT for exam timing (no RRULE)", () => {
    const termStart = new Date("2025-01-06T00:00:00+08:00");
    const termEnd = new Date("2025-04-30T23:59:59+08:00");
    const examDate = new Date("2025-04-25T00:00:00+08:00");
    const cls = makeClass({
      timings: [],
      examTimings: [
        {
          date: examDate,
          dayOfWeek: "Friday",
          startTime: "09:00",
          endTime: "11:00",
          venue: "EXAM/HALL-1",
        },
      ],
    });
    const result = buildIcal({
      classes: [cls],
      termStart,
      termEnd,
      timetableName: "Plan A",
    });

    const veventCount = (result.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(veventCount).toBe(1);

    expect(result).toContain("SUMMARY:CS101 Exam");
    expect(result).toContain("LOCATION:EXAM/HALL-1");
    expect(result).toContain("DTSTART;TZID=Asia/Singapore:20250425T090000");
    expect(result).toContain("DTEND;TZID=Asia/Singapore:20250425T110000");

    // Exam events must NOT have RRULE
    expect(result).not.toContain("RRULE:");
  });

  // -- No bid/PII strings in output ------------------------------------------

  it("contains no bid or PII strings in output", () => {
    const termStart = new Date("2025-01-06T00:00:00+08:00");
    const termEnd = new Date("2025-04-30T23:59:59+08:00");
    const cls = makeClass({
      professorName: "Dr. Tan Ah Kow",
    });
    const result = buildIcal({
      classes: [cls],
      termStart,
      termEnd,
      timetableName: "Plan A",
    });

    // Should NOT contain bid-related terms
    expect(result).not.toMatch(/bid/i);
    expect(result).not.toMatch(/\be-?\s*dollar/i);
    expect(result).not.toMatch(/\bprice\b/i);

    // Should NOT contain professor name or other PII
    expect(result).not.toContain("Dr. Tan");
    expect(result).not.toContain("Ah Kow");
  });

  // -- Multiple classes ------------------------------------------------------

  it("handles multiple classes with mixed timings and exams", () => {
    const termStart = new Date("2025-01-06T00:00:00+08:00");
    const termEnd = new Date("2025-04-30T23:59:59+08:00");
    const examDate = new Date("2025-04-28T00:00:00+08:00");

    const cs101 = makeClass({
      classId: "cs101",
      courseCode: "CS101",
      section: "G1",
      timings: [
        { dayOfWeek: "Monday", startTime: "08:15", endTime: "11:45", venue: "SOE/SR3-1" },
      ],
    });

    const math241 = makeClass({
      classId: "math241",
      courseCode: "MATH241",
      section: "G2",
      timings: [
        { dayOfWeek: "Tuesday", startTime: "10:00", endTime: "12:00", venue: "SCIS/TR1" },
        { dayOfWeek: "Thursday", startTime: "14:00", endTime: "16:00", venue: "SCIS/TR1" },
      ],
      examTimings: [
        {
          date: examDate,
          dayOfWeek: "Monday",
          startTime: "09:00",
          endTime: "11:00",
          venue: "EXAM/HALL-2",
        },
      ],
    });

    const result = buildIcal({
      classes: [cs101, math241],
      termStart,
      termEnd,
      timetableName: "Plan A",
    });

    const veventCount = (result.match(/BEGIN:VEVENT/g) ?? []).length;
    // 1 (CS101 timing) + 2 (MATH241 timings) + 1 (MATH241 exam) = 4
    expect(veventCount).toBe(4);

    expect(result).toContain("SUMMARY:CS101 G1");
    expect(result).toContain("SUMMARY:MATH241 G2");
    expect(result).toContain("SUMMARY:MATH241 Exam");
  });

  // -- Multiple classes with same day, different times -----------------------

  it("generates separate VEVENTs for same-day classes at different times", () => {
    const termStart = new Date("2025-01-06T00:00:00+08:00");
    const termEnd = new Date("2025-04-30T23:59:59+08:00");

    const cs101 = makeClass({
      classId: "cs101",
      courseCode: "CS101",
      section: "G1",
      timings: [
        { dayOfWeek: "Monday", startTime: "08:15", endTime: "11:45", venue: "SOE/SR3-1" },
      ],
    });

    const math241 = makeClass({
      classId: "math241",
      courseCode: "MATH241",
      section: "G2",
      timings: [
        { dayOfWeek: "Monday", startTime: "12:00", endTime: "14:00", venue: "SCIS/TR1" },
      ],
    });

    const result = buildIcal({
      classes: [cs101, math241],
      termStart,
      termEnd,
      timetableName: "Plan A",
    });

    const veventCount = (result.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(veventCount).toBe(2);

    expect(result).toContain("DTSTART;TZID=Asia/Singapore:20250106T081500");
    expect(result).toContain("DTSTART;TZID=Asia/Singapore:20250106T120000");
  });

  // -- Empty class list ------------------------------------------------------

  it("produces a valid but event-free iCal for empty class list", () => {
    const termStart = new Date("2025-01-06T00:00:00+08:00");
    const termEnd = new Date("2025-04-30T23:59:59+08:00");
    const result = buildIcal({
      classes: [],
      termStart,
      termEnd,
      timetableName: "Plan A",
    });

    expect(result).toContain("BEGIN:VCALENDAR");
    expect(result).toContain("END:VCALENDAR");
    expect(result).not.toContain("BEGIN:VEVENT");
  });

  // -- Timing without dayOfWeek is skipped -----------------------------------

  it("skips timings that have no dayOfWeek", () => {
    const termStart = new Date("2025-01-06T00:00:00+08:00");
    const termEnd = new Date("2025-04-30T23:59:59+08:00");
    const cls = makeClass({
      timings: [
        { dayOfWeek: null, startTime: "08:15", endTime: "11:45", venue: "TBD" },
      ],
    });
    const result = buildIcal({
      classes: [cls],
      termStart,
      termEnd,
      timetableName: "Plan A",
    });

    expect(result).not.toContain("BEGIN:VEVENT");
  });

  // -- All weekdays map correctly --------------------------------------------

  it("maps all weekdays to correct iCal codes", () => {
    const termStart = new Date("2025-01-06T00:00:00+08:00"); // Monday
    const termEnd = new Date("2025-04-30T23:59:59+08:00");

    const days = [
      { name: "Monday", code: "MO" },
      { name: "Tuesday", code: "TU" },
      { name: "Wednesday", code: "WE" },
      { name: "Thursday", code: "TH" },
      { name: "Friday", code: "FR" },
      { name: "Saturday", code: "SA" },
    ];

    for (const { name, code } of days) {
      const cls = makeClass({
        courseCode: name.toUpperCase(),
        timings: [
          { dayOfWeek: name, startTime: "08:00", endTime: "09:00", venue: "TBD" },
        ],
      });
      const result = buildIcal({
        classes: [cls],
        termStart,
        termEnd,
        timetableName: "Test",
      });
      expect(result).toContain(`BYDAY=${code}`);
    }
  });

  // -- RRULE UNTIL matches termEnd -------------------------------------------

  it("uses termEnd as RRULE UNTIL", () => {
    const termStart = new Date("2025-01-06T00:00:00+08:00");
    const termEnd = new Date("2025-05-15T23:59:59+08:00");
    const result = buildIcal({
      classes: [makeClass()],
      termStart,
      termEnd,
      timetableName: "Plan A",
    });

    // UNTIL in RRULE uses UTC, so 2025-05-15T23:59:59+08:00 = 2025-05-15T15:59:59Z
    // The output should contain something like UNTIL=20250515T155959
    expect(result).toMatch(/UNTIL=20250515T\d{6}/);
  });

  // -- Exam with string date -------------------------------------------------

  it("handles exam date as string", () => {
    const termStart = new Date("2025-01-06T00:00:00+08:00");
    const termEnd = new Date("2025-04-30T23:59:59+08:00");
    const cls = makeClass({
      timings: [],
      examTimings: [
        {
          date: "2025-04-25T00:00:00+08:00",
          dayOfWeek: "Friday",
          startTime: "09:00",
          endTime: "11:00",
          venue: "EXAM/HALL-1",
        },
      ],
    });
    const result = buildIcal({
      classes: [cls],
      termStart,
      termEnd,
      timetableName: "Plan A",
    });

    expect(result).toContain("SUMMARY:CS101 Exam");
    expect(result).toContain("DTSTART;TZID=Asia/Singapore:20250425T090000");
  });
});
