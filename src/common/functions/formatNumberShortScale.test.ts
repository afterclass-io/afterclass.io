import { describe, expect, it } from "vitest";
import { formatNumberShortScale } from "./formatNumberShortScale";

describe("formatNumberShortScale", () => {
  it("adds K / M / B / T suffixes", () => {
    expect(formatNumberShortScale(1234)).toBe("1.2K");
    expect(formatNumberShortScale(1_234_567)).toBe("1.2M");
    expect(formatNumberShortScale(1_234_567_890)).toBe("1.2B");
    expect(formatNumberShortScale(1_234_567_890_000)).toBe("1.2T");
  });

  it("leaves small numbers unscaled", () => {
    expect(formatNumberShortScale(0)).toBe("0");
    expect(formatNumberShortScale(42)).toBe("42");
  });

  it("keeps the sign on negatives", () => {
    expect(formatNumberShortScale(-1500)).toBe("-1.5K");
  });

  it("respects a custom decimals count", () => {
    expect(formatNumberShortScale(1_234_567, { decimals: 2 })).toBe("1.23M");
  });

  it("lets caller options override the defaults", () => {
    expect(formatNumberShortScale(1_234_567, { compactDisplay: "long" })).toBe(
      "1.2 million",
    );
  });
});
