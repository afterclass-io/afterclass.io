import { describe, expect, it } from "vitest";
import { formatBid, formatExamDate } from "./format";

describe("formatBid", () => {
  it("formats e$ with 2dp and thousands separators", () => {
    expect(formatBid(1234.5)).toBe("e$1,234.50");
    expect(formatBid(0)).toBe("e$0.00");
    expect(formatBid(99.9)).toBe("e$99.90");
  });
});

describe("formatExamDate", () => {
  it("slices the YYYY-MM-DD date part off ISO strings", () => {
    expect(formatExamDate("2026-04-20T00:00:00.000Z")).toBe("2026-04-20");
    expect(formatExamDate("2026-04-20")).toBe("2026-04-20");
  });

  it("returns empty string for null/undefined/empty", () => {
    expect(formatExamDate(null)).toBe("");
    expect(formatExamDate(undefined)).toBe("");
    expect(formatExamDate("")).toBe("");
  });
});
