import { describe, it, expect } from "vitest";
import { formatBidAmount, formatDateSG } from "./format";

describe("formatBidAmount", () => {
  it("formats with 2 decimal places", () => {
    expect(formatBidAmount(1234)).toBe("e$1,234.00");
    expect(formatBidAmount(99.9)).toBe("e$99.90");
    expect(formatBidAmount(0)).toBe("e$0.00");
  });
});

describe("formatDateSG", () => {
  it("formats date in SG locale", () => {
    const result = formatDateSG("2026-12-07");
    expect(result).toBe("7 Dec 2026");
  });
});
