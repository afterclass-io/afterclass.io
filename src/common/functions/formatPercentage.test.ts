import { describe, expect, it } from "vitest";
import { formatPercentage } from "./formatPercentage";

describe("formatPercentage", () => {
  it("formats a 0-1 ratio as a whole-number percent", () => {
    expect(formatPercentage(0)).toBe("0%");
    expect(formatPercentage(0.5)).toBe("50%");
    expect(formatPercentage(1)).toBe("100%");
  });

  it("rounds to no decimals by default", () => {
    expect(formatPercentage(0.1234)).toBe("12%");
  });

  it("honours option overrides", () => {
    expect(
      formatPercentage(0.1234, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    ).toBe("12.3%");
  });
});
