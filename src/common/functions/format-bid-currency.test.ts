import { describe, expect, it } from "vitest";
import { formatBidCurrency, formatBidCurrencyCompact } from "./format-bid-currency";

describe("formatBidCurrency", () => {
  it("formats e$ with 2dp and thousands separators", () => {
    expect(formatBidCurrency(1234.5)).toBe("e$1,234.50");
    expect(formatBidCurrency(0)).toBe("e$0.00");
  });
});

describe("formatBidCurrencyCompact", () => {
  it("uses short scale above 1k and full precision below", () => {
    expect(formatBidCurrencyCompact(1200)).toBe("e$1.2K");
    expect(formatBidCurrencyCompact(1234.5)).toBe("e$1.2K");
    expect(formatBidCurrencyCompact(999)).toBe("e$999.00");
    expect(formatBidCurrencyCompact(1_500_000)).toBe("e$1.5M");
  });

  it("rolls over to M when K-representation rounds to 1000.0", () => {
    // Values whose (n/1000).toFixed(1) would be "1000.0" must use M
    expect(formatBidCurrencyCompact(999_950)).toBe("e$1.0M");
    expect(formatBidCurrencyCompact(999_999)).toBe("e$1.0M");
  });

  it("handles K→M boundary precisely", () => {
    // Just below the round-up threshold → stays K
    expect(formatBidCurrencyCompact(999_499)).toBe("e$999.5K");
    // Exactly at the typical 1M threshold
    expect(formatBidCurrencyCompact(1_000_000)).toBe("e$1.0M");
  });

  it("rounds M-band values to 1 decimal", () => {
    expect(formatBidCurrencyCompact(1_499_999)).toBe("e$1.5M");
    expect(formatBidCurrencyCompact(1_500_000)).toBe("e$1.5M");
    expect(formatBidCurrencyCompact(1_999_999)).toBe("e$2.0M");
    expect(formatBidCurrencyCompact(2_000_000)).toBe("e$2.0M");
  });

  it("handles zero", () => {
    expect(formatBidCurrencyCompact(0)).toBe("e$0.00");
  });

  it("handles negative values without producing e$- ambiguity", () => {
    // Sub-1k negative: full precision
    expect(formatBidCurrencyCompact(-500)).toBe("e$-500.00");
    // K-band negative
    expect(formatBidCurrencyCompact(-1_200)).toBe("e$-1.2K");
    expect(formatBidCurrencyCompact(-999_499)).toBe("e$-999.5K");
    // Near the round-up threshold (negative): correctly rolls to M, avoiding "e$-1000.0K"
    expect(formatBidCurrencyCompact(-999_999)).toBe("e$-1.0M");
    // M-band negative
    expect(formatBidCurrencyCompact(-1_000_000)).toBe("e$-1.0M");
    expect(formatBidCurrencyCompact(-1_500_000)).toBe("e$-1.5M");
  });
});
