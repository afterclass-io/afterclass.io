import { describe, expect, it } from "vitest";
import { getQuotaMeterState } from "./logic";

describe("getQuotaMeterState", () => {
  it("is ok above the nudgeAt threshold", () => {
    expect(getQuotaMeterState(50, 50, 40)).toEqual({ level: "ok", pct: 100, remaining: 50, quota: 50 });
    expect(getQuotaMeterState(41, 50, 40).level).toBe("ok");
  });
  it("is low at or below nudgeAt but above the 20% floor", () => {
    expect(getQuotaMeterState(40, 50, 40).level).toBe("low");
    expect(getQuotaMeterState(11, 50, 40).level).toBe("low");
  });
  it("is critical at or below 20% of quota (min 1)", () => {
    expect(getQuotaMeterState(10, 50, 40).level).toBe("critical");
    expect(getQuotaMeterState(1, 50, 40).level).toBe("critical");
    expect(getQuotaMeterState(0, 50, 40).level).toBe("critical");
  });
  it("clamps pct to 0..100", () => {
    expect(getQuotaMeterState(0, 50, 40).pct).toBe(0);
    expect(getQuotaMeterState(80, 50, 40).pct).toBe(100);
  });
});
