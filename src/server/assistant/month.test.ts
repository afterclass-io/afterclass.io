import { describe, expect, it } from "vitest";
import { currentMonthPeriod } from "./month";

describe("currentMonthPeriod", () => {
  it("formats the Singapore month as YYYY-MM", () => {
    // 2026-08-02 12:00 SGT
    const now = new Date("2026-08-02T04:00:00.000Z");
    expect(currentMonthPeriod(now)).toBe("2026-08");
  });
});
