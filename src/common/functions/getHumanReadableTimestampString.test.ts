import { describe, expect, it } from "vitest";
import cases from "./getHumanReadableTimestampString.cases.json";
import { getHumanReadableTimestampString } from "./getHumanReadableTimestampString";

describe("getHumanReadableTimestampString", () => {
  it("formats as '<SGT date> <SGT time>'", () => {
    for (const { ms, expected } of cases) {
      expect(getHumanReadableTimestampString(ms)).toBe(expected);
    }
  });

  it("passes the argument straight to `new Date` (milliseconds, not seconds)", () => {
    expect(getHumanReadableTimestampString(1672504200000)).toBe(
      "1 Jan 2023 00:30",
    );
  });
});
