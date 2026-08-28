import { describe, expect, it } from "vitest";
import { getQuotaAlert } from "./quota-alert";

describe("getQuotaAlert", () => {
  it("is null above 50% remaining", () => {
    expect(getQuotaAlert(26, 50)).toBeNull();
    expect(getQuotaAlert(50, 50)).toBeNull();
  });
  it("warns at or below 50%", () => {
    expect(getQuotaAlert(25, 50)?.level).toBe("warn");
    expect(getQuotaAlert(6, 50)?.level).toBe("warn");
  });
  it("is critical at or below 10%", () => {
    expect(getQuotaAlert(5, 50)?.level).toBe("critical");
    expect(getQuotaAlert(1, 50)?.level).toBe("critical");
  });
  it("is critical at zero remaining", () => {
    expect(getQuotaAlert(0, 50)?.level).toBe("critical");
    expect(getQuotaAlert(0, 50)?.remaining).toBe(0);
  });
});
