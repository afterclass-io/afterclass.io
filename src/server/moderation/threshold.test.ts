import { describe, expect, it } from "vitest";

import { effectiveThreshold } from "./threshold";

const cfg = {
  moderationReportThreshold: 3,
  moderationBackoffMultiplier: 2,
  moderationThresholdCap: 48,
};

describe("effectiveThreshold", () => {
  it("starts at the base threshold", () => {
    expect(effectiveThreshold(cfg, 0)).toBe(3);
  });
  it("multiplies with every clearance", () => {
    expect(effectiveThreshold(cfg, 1)).toBe(6);
    expect(effectiveThreshold(cfg, 2)).toBe(12);
    expect(effectiveThreshold(cfg, 4)).toBe(48);
  });
  it("never exceeds the cap, however many clearances", () => {
    expect(effectiveThreshold(cfg, 5)).toBe(48);
    expect(effectiveThreshold(cfg, 10_000)).toBe(48);
  });
  it("caps a base threshold that is already above the cap", () => {
    expect(
      effectiveThreshold({ ...cfg, moderationReportThreshold: 100 }, 0),
    ).toBe(48);
  });
});
