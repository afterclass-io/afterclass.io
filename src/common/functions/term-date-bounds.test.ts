import { describe, expect, it } from "vitest";

import {
  addDaysIso,
  clampRangeToTerm,
  countDaysInclusive,
  defaultRangeInTerm,
  isWithinTerm,
  termDateWindow,
  todayIsoSGT,
} from "./term-date-bounds";

const TERM = {
  startDt: new Date("2026-08-17T00:00:00.000Z"),
  endDt: new Date("2026-12-06T23:59:59.999Z"),
};

describe("termDateWindow", () => {
  it("reduces timestamps to UTC calendar days", () => {
    expect(termDateWindow(TERM)).toEqual({ start: "2026-08-17", end: "2026-12-06" });
  });
});

describe("todayIsoSGT", () => {
  it("rolls over to the next day after 16:00 UTC", () => {
    expect(todayIsoSGT(new Date("2026-10-05T15:59:00Z"))).toBe("2026-10-05");
    expect(todayIsoSGT(new Date("2026-10-05T16:00:00Z"))).toBe("2026-10-06");
  });
});

describe("addDaysIso / countDaysInclusive", () => {
  it("adds days across month boundaries", () => {
    expect(addDaysIso("2026-10-30", 3)).toBe("2026-11-02");
  });

  it("counts both ends of the range", () => {
    expect(countDaysInclusive({ start: "2026-10-05", end: "2026-10-05" })).toBe(1);
    expect(countDaysInclusive({ start: "2026-10-05", end: "2026-10-19" })).toBe(15);
  });
});

describe("isWithinTerm", () => {
  it("accepts ranges inside and on the term edges", () => {
    expect(isWithinTerm({ start: "2026-08-17", end: "2026-08-20" }, TERM)).toBe(true);
    expect(isWithinTerm({ start: "2026-12-01", end: "2026-12-06" }, TERM)).toBe(true);
  });

  it("rejects ranges that start before or end after the term", () => {
    expect(isWithinTerm({ start: "2026-08-16", end: "2026-08-20" }, TERM)).toBe(false);
    expect(isWithinTerm({ start: "2026-12-05", end: "2026-12-07" }, TERM)).toBe(false);
  });
});

describe("clampRangeToTerm", () => {
  it("leaves in-term ranges untouched", () => {
    const range = { start: "2026-10-05", end: "2026-10-09" };
    expect(clampRangeToTerm(range, TERM)).toEqual(range);
  });

  it("trims ranges that overflow either end", () => {
    expect(clampRangeToTerm({ start: "2026-08-10", end: "2026-08-20" }, TERM)).toEqual({
      start: "2026-08-17",
      end: "2026-08-20",
    });
    expect(clampRangeToTerm({ start: "2026-12-01", end: "2026-12-20" }, TERM)).toEqual({
      start: "2026-12-01",
      end: "2026-12-06",
    });
  });

  it("collapses ranges entirely outside the term onto its nearest day", () => {
    expect(clampRangeToTerm({ start: "2027-01-10", end: "2027-01-12" }, TERM)).toEqual({
      start: "2026-12-06",
      end: "2026-12-06",
    });
  });
});

describe("defaultRangeInTerm", () => {
  it("starts today and spans the requested number of days", () => {
    expect(defaultRangeInTerm("2026-10-05", TERM, 5)).toEqual({
      start: "2026-10-05",
      end: "2026-10-09",
    });
  });

  it("starts at the term start when the term has not begun", () => {
    expect(defaultRangeInTerm("2026-07-01", TERM, 5)).toEqual({
      start: "2026-08-17",
      end: "2026-08-21",
    });
  });

  it("never runs past the term end", () => {
    expect(defaultRangeInTerm("2026-12-05", TERM, 5)).toEqual({
      start: "2026-12-05",
      end: "2026-12-06",
    });
  });
});
