// src/server/config/chat-config.test.ts
import { describe, expect, it } from "vitest";
import { getChatConfig } from "./chat-config";
describe("getChatConfig", () => {
  it("rejects negative rate limits instead of global-429", () => {
    process.env.CHAT_RATE_LIMIT_PER_MINUTE = "-1";
    expect(() => getChatConfig()).toThrow(/rate/i);
    delete process.env.CHAT_RATE_LIMIT_PER_MINUTE;
  });
  it("exposes quota, spend cap, token budgets, and bid floors", () => {
    const c = getChatConfig();
    expect(c.quotaPerMonth).toBeGreaterThan(0);
    expect(c.spendCapUsd).toBeGreaterThan(0);
    expect(c.minBid).toBe(10);
  });
});
