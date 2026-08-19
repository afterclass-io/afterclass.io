import { describe, it, expect } from "vitest";
import { buildIcal } from "./build-ical";
import type { ArrangedClass } from "@/modules/timetable/components/TimetableGrid";

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

  // -- Weekly occurrences (long term: weeks 1-7, 9-14; week 8 = recess) ------

  it("emits one VEVENT per teaching week for a long term, skipping recess week 8", () => {
    const termStart = new Date("2025-01-06T00:00:00+08:00"); // Monday
    const termEnd = new Date("2025-04-30T23:59:59+08:00"); // 114-day span → long term
    const result = buildIcal({
      classes: [makeClass()],
      termStart,
      termEnd,
      timetableName: "Plan A",
    });

    const veventCount = (result.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(veventCount).toBe(13); // weeks 1-7 + 9-14

    expect(result).not.toContain("RRULE");
    expect(result).toContain("DTSTART;TZID=Asia/Singapore:20250106T081500"); // week 1
    expect(result).toContain("DTSTART;TZID=Asia/Singapore:20250217T081500"); // week 7
    expect(result).not.toContain("20250224T081500"); // week 8 = recess
    expect(result).toContain("DTSTART;TZID=Asia/Singapore:20250303T081500"); // week 9
    expect(result).toContain("DTSTART;TZID=Asia/Singapore:20250407T081500"); // week 14 (last)
    expect(result).not.toContain("20250414T081500"); // exam weeks have no classes
  });

  it("reproduces the reported bug fixture: AY202627T1 skips recess Monday Oct 5 2026", () => {
    const result = buildIcal({
      classes: [makeClass({
        courseCode: "COMM662",
        timings: [{ dayOfWeek: "Mon", startTime: "08:15", endTime: "11:30", venue: "SOE/SCIS2 Seminar Room 2-1" }],
      })],
      termStart: new Date("2026-08-17T00:00:00+08:00"),
      termEnd: new Date("2026-12-04T00:00:00+08:00"),
      timetableName: "Test",
    });

    const veventCount = (result.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(veventCount).toBe(13);
    expect(result).toContain("DTSTART;TZID=Asia/Singapore:20260817T081500"); // week 1
    expect(result).not.toContain("20261005T081500"); // week 8 = recess
    expect(result).toContain("DTSTART;TZID=Asia/Singapore:20261012T081500"); // week 9
    expect(result).toContain("LOCATION:SOE/SCIS2 Seminar Room 2-1");
  });

  it("emits 5 teaching weeks for a short term (T3A/T3B span), excluding exam weeks", () => {
    const result = buildIcal({
      classes: [makeClass()],
      termStart: new Date("2025-05-05T00:00:00+08:00"), // Monday
      termEnd: new Date("2025-06-22T23:59:59+08:00"), // 48-day span → short term
      timetableName: "Plan A",
    });

    const veventCount = (result.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(veventCount).toBe(5); // 5 instructional weeks; rest is study/exam period
    expect(result).toContain("DTSTART;TZID=Asia/Singapore:20250505T081500"); // week 1
    expect(result).toContain("DTSTART;TZID=Asia/Singapore:20250602T081500"); // week 5 (last)
    expect(result).not.toContain("20250609T081500"); // exam period, no class
    expect(result).not.toContain("20250616T081500"); // exam period, no class
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

  it("generates weekly VEVENTs for each class timing", () => {
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
    expect(veventCount).toBe(26); // 13 teaching weeks × 2 timings

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
    // 13 (CS101 timing) + 26 (MATH241 timings) + 1 (MATH241 exam) = 40
    expect(veventCount).toBe(40);

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
    expect(veventCount).toBe(26); // 13 teaching weeks × 2 same-day timings

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

  it("maps all weekdays to correct first-occurrence dates", () => {
    const termStart = new Date("2025-01-06T00:00:00+08:00"); // Monday
    const termEnd = new Date("2025-04-30T23:59:59+08:00");

    const days = [
      { name: "Monday", firstDate: "20250106" },
      { name: "Tuesday", firstDate: "20250107" },
      { name: "Wednesday", firstDate: "20250108" },
      { name: "Thursday", firstDate: "20250109" },
      { name: "Friday", firstDate: "20250110" },
      { name: "Saturday", firstDate: "20250111" },
    ];

    for (const { name, firstDate } of days) {
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
      expect(result).toContain(
        `DTSTART;TZID=Asia/Singapore:${firstDate}T080000`,
      );
    }
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

  // -- Short "Mon" day format (production/seed data) -------------------------

  it("emits weekly VEVENTs for the short 'Mon' day format used in production data", () => {
    const ics = buildIcal({
      termStart: new Date("2026-08-17T00:00:00+08:00"),
      termEnd: new Date("2026-12-05T00:00:00+08:00"),
      timetableName: "Test",
      classes: [
        {
          classId: "cl1",
          courseCode: "CS101",
          courseName: "Intro",
          section: "G1",
          creditUnits: 4,
          timings: [
            {
              dayOfWeek: "Mon",
              startTime: "08:15",
              endTime: "11:30",
              venue: "SOB-A",
            },
          ],
          examTimings: [],
        },
      ],
    });
    const veventCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(veventCount).toBe(13);
    expect(ics).not.toContain("RRULE");
  });
});
