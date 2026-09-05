import { describe, expect, it } from "vitest";
import { getHumanReadableTimestampString } from "./getHumanReadableTimestampString";

describe("getHumanReadableTimestampString", () => {
  it("formats as '<localeDate> <localeTime>'", () => {
    const ms = Date.UTC(2022, 5, 15, 12, 30, 45);
    const d = new Date(ms);
    expect(getHumanReadableTimestampString(ms)).toBe(
      `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`,
    );
  });

  it("passes the argument straight to `new Date` (milliseconds, not seconds)", () => {
    const d = new Date(1_000);
    expect(getHumanReadableTimestampString(1_000)).toBe(
      `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`,
    );
  });
});
