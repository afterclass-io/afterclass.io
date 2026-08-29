import { describe, expect, it } from "vitest";
import { formatDateSGT } from "./format-date-sgt";

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
