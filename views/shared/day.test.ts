// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { DAY_ORDER, normalizeDay } from "./day";

describe("normalizeDay", () => {
  it("title-cases any day casing (Mon/MON/monday → Mon)", () => {
    expect(normalizeDay("Mon")).toBe("Mon");
    expect(normalizeDay("MON")).toBe("Mon");
    expect(normalizeDay("monday")).toBe("Mon");
    expect(normalizeDay("Thurs")).toBe("Thu");
    expect(normalizeDay("THURSDAY")).toBe("Thu");
    expect(normalizeDay("  tue  ")).toBe("Tue");
  });

  it("returns null for null/undefined/empty/unknown (unknown→null contract)", () => {
    expect(normalizeDay(null)).toBeNull();
    expect(normalizeDay(undefined)).toBeNull();
    expect(normalizeDay("")).toBeNull();
    expect(normalizeDay("Funday")).toBeNull();
    expect(normalizeDay("TBA")).toBeNull();
  });

  it("exposes Mon–Sun DAY_ORDER", () => {
    expect([...DAY_ORDER]).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
  });
});
