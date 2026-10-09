import { describe, expect, it } from "vitest";
import cases from "./format-date-sgt.cases.json";
import {
  formatDateSGT,
  formatDateTimeSGT,
  formatTimeSGT,
} from "./format-date-sgt";

describe("formatDateSGT", () => {
  it("formats in en-SG with the Asia/Singapore timezone", () => {
    // 2026-08-17 00:30 +08 == 2026-08-16 16:30 UTC
    const d = new Date("2026-08-16T16:30:00Z");
    expect(formatDateSGT(d)).toBe("17 Aug 2026");
  });

  it("honours option overrides", () => {
    const d = new Date("2026-08-17T00:00:00+08:00");
    expect(formatDateSGT(d, { day: "numeric", month: "long" })).toBe(
      "17 August",
    );
  });
});

describe("formatTimeSGT", () => {
  it("renders a 24-hour clock in Singapore time", () => {
    expect(formatTimeSGT(new Date("2026-10-12T06:30:00Z"))).toBe("14:30");
    expect(formatTimeSGT(new Date("2026-10-12T00:05:00+08:00"))).toBe("00:05");
  });
});

describe("formatDateTimeSGT", () => {
  it("formats date and time in SGT", () => {
    for (const { iso, expected } of cases.dateTime) {
      expect(formatDateTimeSGT(new Date(iso))).toBe(expected);
      expect(formatDateTimeSGT(iso)).toBe(expected);
    }
  });
});

describe("formatDateSGT day boundary", () => {
  it("handles day boundaries and formatting options", () => {
    for (const { iso, expected } of cases.dayBoundary) {
      expect(formatDateSGT(iso)).toBe(expected);
    }
    expect(
      formatDateSGT(new Date("2026-10-08T00:00:00+08:00"), {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    ).toBe("08 Oct 2026");
  });
});
