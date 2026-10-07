import { describe, expect, it } from "vitest";
import { formatDateSGT, formatTimeSGT } from "./format-date-sgt";

describe("formatDateSGT", () => {
  it("formats in en-SG with the Asia/Singapore timezone", () => {
    // 2026-08-17 00:30 +08 == 2026-08-16 16:30 UTC
    const d = new Date("2026-08-16T16:30:00Z");
    expect(formatDateSGT(d)).toBe("17 Aug 2026");
  });

  it("honours option overrides", () => {
    const d = new Date("2026-08-17T00:00:00+08:00");
    expect(formatDateSGT(d, { day: "numeric", month: "long" })).toBe("17 August");
  });
});

describe("formatTimeSGT", () => {
  it("renders a 24-hour clock in Singapore time", () => {
    expect(formatTimeSGT(new Date("2026-10-12T06:30:00Z"))).toBe("14:30");
    expect(formatTimeSGT(new Date("2026-10-12T00:05:00+08:00"))).toBe("00:05");
  });
});
