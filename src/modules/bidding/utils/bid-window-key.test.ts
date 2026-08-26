import { describe, expect, it } from "vitest";
import { formatBidWindowKey, parseBidWindowKey } from "./bid-window-key";

describe("formatBidWindowKey", () => {
  it("joins term, round, and window with slashes", () => {
    expect(formatBidWindowKey("AY202627T1", "1A", 2)).toBe("AY202627T1/1A/2");
  });

  it("accepts a string window", () => {
    expect(formatBidWindowKey("AY202627T1", "2", "3")).toBe("AY202627T1/2/3");
  });
});

describe("parseBidWindowKey", () => {
  it("round-trips a well-formed key", () => {
    expect(parseBidWindowKey("AY202627T1/1A/2")).toEqual({
      acadTermId: "AY202627T1",
      round: "1A",
      window: "2",
    });
  });

  it("defaults missing trailing segments to empty strings", () => {
    expect(parseBidWindowKey("AY202627T1")).toEqual({
      acadTermId: "AY202627T1",
      round: "",
      window: "",
    });
  });

  it("defaults every segment of an empty key to an empty string", () => {
    expect(parseBidWindowKey("")).toEqual({
      acadTermId: "",
      round: "",
      window: "",
    });
  });
});
