// src/server/config/chat-config.test.ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHAT_CONFIG_VALUES,
  getBidLimits,
  getChatConfig,
  getToolOutputBudget,
} from "./chat-config";
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
  it("bid getters mirror canonical defaults", () => {
    expect(getBidLimits()).toEqual({
      minBid: 10,
      maxBidBudget: 10000,
      defaultBeatsPct: 70,
      maxBidAmount: 99999,
    });
    expect(DEFAULT_CHAT_CONFIG_VALUES.minBid).toBe(10);
  });
  it("tool-output budget getter mirrors the truncation contract", () => {
    const b = getToolOutputBudget();
    expect(b.maxChars).toBe(24000);
    expect(b.note).toMatch(/refine your query/);
  });
});
