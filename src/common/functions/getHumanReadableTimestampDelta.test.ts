import { afterEach, describe, expect, it, vi } from "vitest";
import { getHumanReadableTimestampDelta } from "./getHumanReadableTimestampDelta";

const SEC = 1;
const MIN = 60;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

afterEach(() => {
  vi.useRealTimers();
});

describe("getHumanReadableTimestampDelta", () => {
  it("picks the largest fitting unit", () => {
    expect(getHumanReadableTimestampDelta(0, 2 * YEAR)).toBe("2y");
    expect(getHumanReadableTimestampDelta(0, 3 * MONTH)).toBe("3mo");
    expect(getHumanReadableTimestampDelta(0, 2 * WEEK)).toBe("2w");
    expect(getHumanReadableTimestampDelta(0, 5 * DAY)).toBe("5d");
    expect(getHumanReadableTimestampDelta(0, 6 * HOUR)).toBe("6h");
    expect(getHumanReadableTimestampDelta(0, 45 * MIN)).toBe("45m");
    expect(getHumanReadableTimestampDelta(0, 10 * SEC)).toBe("10s");
  });

  it("uses the absolute delta (order-independent)", () => {
    expect(getHumanReadableTimestampDelta(5 * DAY, 0)).toBe("5d");
  });

  it("returns 'just now' for sub-second deltas", () => {
    expect(getHumanReadableTimestampDelta(100, 100)).toBe("just now");
    expect(getHumanReadableTimestampDelta(100, 100.5)).toBe("just now");
  });

  it("defaults the second timestamp to now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const nowSec = Date.now() / 1000;
    expect(getHumanReadableTimestampDelta(nowSec - 3 * DAY)).toBe("3d");
  });
});
