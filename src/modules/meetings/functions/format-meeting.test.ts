import { describe, expect, it } from "vitest";

import {
  formatHourLabel,
  formatMeetingHours,
  formatMeetingSummary,
  formatPeopleCount,
} from "./format-meeting";

describe("formatMeetingHours", () => {
  it("zero-pads both ends", () => {
    expect(formatMeetingHours(8, 22)).toBe("08:00–22:00");
    expect(formatMeetingHours(0, 24)).toBe("00:00–24:00");
  });
});

describe("formatHourLabel", () => {
  it("uses a 12-hour clock with midnight and noon handled", () => {
    expect(formatHourLabel(0)).toBe("12 AM");
    expect(formatHourLabel(8)).toBe("8 AM");
    expect(formatHourLabel(12)).toBe("12 PM");
    expect(formatHourLabel(22)).toBe("10 PM");
    expect(formatHourLabel(24)).toBe("12 AM");
  });
});

describe("formatPeopleCount", () => {
  it("pluralises", () => {
    expect(formatPeopleCount(0)).toBe("0 people");
    expect(formatPeopleCount(1)).toBe("1 person");
    expect(formatPeopleCount(4)).toBe("4 people");
  });
});

describe("formatMeetingSummary", () => {
  it("joins dates, hours and people on one line", () => {
    const year = new Date().getFullYear();
    expect(
      formatMeetingSummary({
        startDate: `${year}-10-12T00:00:00Z`,
        endDate: `${year}-10-16T00:00:00Z`,
        startHour: 8,
        endHour: 22,
        participantCount: 2,
      }),
    ).toBe("12–16 Oct · 08:00–22:00 · 2 people");
  });
});
