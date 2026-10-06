import { describe, expect, it } from "vitest";

import { formatDateRangeSGT } from "./format-date-range-sgt";

const NOW = new Date("2026-10-05T04:00:00Z");

describe("formatDateRangeSGT", () => {
  it("collapses a range inside one month", () => {
    expect(
      formatDateRangeSGT("2026-10-12T00:00:00Z", "2026-10-16T00:00:00Z", NOW),
    ).toBe("12–16 Oct");
  });

  it("spells out both months when the range crosses a month", () => {
    expect(
      formatDateRangeSGT("2026-10-30T00:00:00Z", "2026-11-02T00:00:00Z", NOW),
    ).toBe("30 Oct – 2 Nov");
  });

  it("renders a single day once", () => {
    expect(
      formatDateRangeSGT("2026-10-05T00:00:00Z", "2026-10-05T00:00:00Z", NOW),
    ).toBe("5 Oct");
  });

  it("adds the year when it is not the current year", () => {
    expect(
      formatDateRangeSGT("2027-01-04T00:00:00Z", "2027-01-08T00:00:00Z", NOW),
    ).toBe("4–8 Jan 2027");
    expect(
      formatDateRangeSGT("2026-12-30T00:00:00Z", "2027-01-02T00:00:00Z", NOW),
    ).toBe("30 Dec 2026 – 2 Jan 2027");
  });
});
