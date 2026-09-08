import { describe, expect, it } from "vitest";
import { getQuotaAlert } from "./quota-alert";

describe("getQuotaAlert", () => {
  it("is null above 50% remaining", () => {
    expect(getQuotaAlert(26, 50)).toBeNull();
    expect(getQuotaAlert(50, 50)).toBeNull();
  });
  it("warns at or below 50%", () => {
    expect(getQuotaAlert(25, 50)?.level).toBe("warn");
    expect(getQuotaAlert(11, 50)?.level).toBe("warn");
  });
  it("is critical at or below the shared 20% floor", () => {
    // quota=50 → floor(50*0.2)=10, reconciled with criticalFloorFor (I11).
    expect(getQuotaAlert(10, 50)?.level).toBe("critical");
    expect(getQuotaAlert(5, 50)?.level).toBe("critical");
    expect(getQuotaAlert(1, 50)?.level).toBe("critical");
  });
  it("is critical at zero remaining", () => {
    expect(getQuotaAlert(0, 50)?.level).toBe("critical");
    expect(getQuotaAlert(0, 50)?.remaining).toBe(0);
  });
  it("clamps pct to 0–100 (never negative, never above 100)", () => {
    // Over-quota arithmetic (remaining > quota) clamps at 100…
    expect(getQuotaAlert(60, 50)).toBeNull(); // 120% → no alert anyway
    // …and degenerate inputs never render a negative bar.
    expect(getQuotaAlert(-5, 50)?.pct).toBe(0);
  });
});
