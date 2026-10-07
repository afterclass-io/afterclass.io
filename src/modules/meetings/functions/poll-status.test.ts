import { describe, expect, it } from "vitest";

import { groupMeetingsByStatus } from "./poll-status";

const meeting = (id: string, start: string, end: string) => ({
  id,
  startDate: new Date(`${start}T00:00:00Z`),
  endDate: new Date(`${end}T00:00:00Z`),
});

// 5 Oct 2026, 12:00 SGT
const NOW = new Date("2026-10-05T04:00:00Z");

describe("groupMeetingsByStatus", () => {
  it("treats a meeting ending today as upcoming", () => {
    const { upcoming, past } = groupMeetingsByStatus(
      [meeting("today", "2026-10-01", "2026-10-05")],
      NOW,
    );
    expect(upcoming.map((m) => m.id)).toEqual(["today"]);
    expect(past).toEqual([]);
  });

  it("puts ended meetings in past, most recently ended first", () => {
    const { upcoming, past } = groupMeetingsByStatus(
      [
        meeting("older", "2026-09-01", "2026-09-05"),
        meeting("recent", "2026-10-01", "2026-10-04"),
      ],
      NOW,
    );
    expect(upcoming).toEqual([]);
    expect(past.map((m) => m.id)).toEqual(["recent", "older"]);
  });

  it("orders upcoming meetings by start date", () => {
    const { upcoming } = groupMeetingsByStatus(
      [
        meeting("later", "2026-10-19", "2026-10-23"),
        meeting("sooner", "2026-10-12", "2026-10-16"),
      ],
      NOW,
    );
    expect(upcoming.map((m) => m.id)).toEqual(["sooner", "later"]);
  });

  it("compares days in Singapore time, not UTC", () => {
    // 5 Oct 2026, 23:30 UTC is already 6 Oct in Singapore
    const lateUtc = new Date("2026-10-05T23:30:00Z");
    const { upcoming, past } = groupMeetingsByStatus(
      [meeting("yesterdaySgt", "2026-10-01", "2026-10-05")],
      lateUtc,
    );
    expect(upcoming).toEqual([]);
    expect(past).toHaveLength(1);
  });
});
