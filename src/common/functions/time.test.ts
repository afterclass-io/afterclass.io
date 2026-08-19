import { describe, expect, it } from "vitest";
import { parseTimeParts, parseTimePartsSafe, timeToMinutes } from "./time";

describe("timeToMinutes", () => {
  it("parses HH:MM", () => {
    expect(timeToMinutes("08:15")).toBe(495);
    expect(timeToMinutes("22:15")).toBe(1335);
  });

  it("throws on invalid formats", () => {
    expect(() => timeToMinutes("8:15")).toThrow();
    expect(() => timeToMinutes("25:00")).toThrow();
    expect(() => timeToMinutes("")).toThrow();
  });
});

describe("parseTimeParts", () => {
  it("parses HH:MM and HH:MM:SS into [h, m]", () => {
    expect(parseTimeParts("08:15")).toEqual([8, 15]);
    expect(parseTimeParts("08:15:00")).toEqual([8, 15]);
  });

  it("is permissive: returns NaN for non-numeric input", () => {
    const [h, m] = parseTimeParts("abc");
    expect(Number.isNaN(h)).toBe(true);
    // second element is undefined → 0 via ?? fallback
    expect(m).toBe(0);
  });

  it("is permissive: allows hours >= 24", () => {
    expect(parseTimeParts("24:00")).toEqual([24, 0]);
  });
});

describe("parseTimePartsSafe", () => {
  it("returns [h, m] for valid times", () => {
    expect(parseTimePartsSafe("09:00")).toEqual([9, 0]);
    expect(parseTimePartsSafe("9:00")).toEqual([9, 0]);
    expect(parseTimePartsSafe("14:30")).toEqual([14, 30]);
    expect(parseTimePartsSafe("00:00")).toEqual([0, 0]);
    expect(parseTimePartsSafe("23:59")).toEqual([23, 59]);
  });

  it("returns null for non-numeric input (\"abc\")", () => {
    expect(parseTimePartsSafe("abc")).toBeNull();
  });

  it("returns null for hours >= 24 (\"24:00\")", () => {
    expect(parseTimePartsSafe("24:00")).toBeNull();
  });

  it("returns null for minutes >= 60", () => {
    expect(parseTimePartsSafe("12:60")).toBeNull();
  });

  it("returns null for negative values", () => {
    expect(parseTimePartsSafe("-1:00")).toBeNull();
  });

  it("returns null for invalid values", () => {
    // empty string splits to [0] → parseTimeParts returns [0, 0] which IS valid
    expect(parseTimePartsSafe("")).toEqual([0, 0]);
  });
});
