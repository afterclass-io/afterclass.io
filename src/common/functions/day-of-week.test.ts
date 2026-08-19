import { describe, expect, it } from "vitest";
import {
  dayOfWeekToIcalCode,
  dayOfWeekToNumber,
  normalizeDayOfWeek,
} from "./day-of-week";

describe("normalizeDayOfWeek", () => {
  it("normalizes short, long, and mixed-case forms", () => {
    expect(normalizeDayOfWeek("Mon")).toBe("MON");
    expect(normalizeDayOfWeek("MONDAY")).toBe("MON");
    expect(normalizeDayOfWeek("tue")).toBe("TUE");
    expect(normalizeDayOfWeek("Thurs")).toBe("THU");
    expect(normalizeDayOfWeek("THURSDAY")).toBe("THU");
    expect(normalizeDayOfWeek(null)).toBeNull();
    expect(normalizeDayOfWeek("")).toBeNull();
  });
});

describe("dayOfWeekToNumber", () => {
  it("maps Mon..Sat to 1..6 and leaves Sunday null (grid behavior)", () => {
    expect(dayOfWeekToNumber("Mon")).toBe(1);
    expect(dayOfWeekToNumber("Saturday")).toBe(6);
    expect(dayOfWeekToNumber("Sun")).toBeNull();
  });
});

describe("dayOfWeekToIcalCode", () => {
  it("maps short names to 2-letter iCal codes", () => {
    expect(dayOfWeekToIcalCode("Mon")).toBe("MO");
    expect(dayOfWeekToIcalCode("Monday")).toBe("MO");
    expect(dayOfWeekToIcalCode("Sun")).toBe("SU");
    expect(dayOfWeekToIcalCode("garbage")).toBeNull();
  });
});
