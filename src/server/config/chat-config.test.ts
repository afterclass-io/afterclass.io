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
  it("exposes quota, token budgets, and bid floors", () => {
    const c = getChatConfig();
    expect(c.quotaPerMonth).toBeGreaterThan(0);
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
  it("defaults point at the OpenRouter preset transport", () => {
    expect(DEFAULT_CHAT_CONFIG_VALUES.llmBaseUrl).toBe(
      "https://openrouter.ai/api/v1",
    );
    expect(DEFAULT_CHAT_CONFIG_VALUES.llmModel).toBe("@preset/afterclass");
  });
  // Task 4 kill-switches: default true, ecfg-only (no ENV_BINDINGS entries).
  it("defaults kill-switch flags to true with no env bindings", async () => {
    const { DEFAULT_CHAT_CONFIG_VALUES: d, getChatConfig: get } =
      await import("./chat-config");
    expect(d.chatEnabled).toBe(true);
    expect(d.widgetEnabled).toBe(true);
    expect(d.mcpEnabled).toBe(true);
    expect(get().chatEnabled).toBe(true);
    expect(get().widgetEnabled).toBe(true);
    expect(get().mcpEnabled).toBe(true);
  });
  it("canonical schema parses explicit false kill-switch flags", async () => {
    const { chatConfigSchema } = await import("./chat-config");
    const parsed = chatConfigSchema.parse({
      ...DEFAULT_CHAT_CONFIG_VALUES,
      chatEnabled: false,
      widgetEnabled: false,
      mcpEnabled: false,
    });
    expect(parsed.chatEnabled).toBe(false);
    expect(parsed.widgetEnabled).toBe(false);
    expect(parsed.mcpEnabled).toBe(false);
  });
});
