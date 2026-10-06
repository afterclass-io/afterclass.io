// src/server/config/chat-config.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
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
  // Kill-switches: default true, ecfg-only (no ENV_BINDINGS entries).
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
  it("moderation tunables default to the agreed values", () => {
    const c = getChatConfig({ NODE_ENV: "test" });
    expect({
      threshold: c.moderationReportThreshold,
      multiplier: c.moderationBackoffMultiplier,
      cap: c.moderationThresholdCap,
      perHour: c.moderationJudgementsPerHour,
      reportsPerHour: c.moderationReportsPerHour,
      claimMinutes: c.moderationClaimWindowMinutes,
      timeoutMs: c.moderationJudgeTimeoutMs,
      retentionDays: c.moderationLogRetentionDays,
      model: c.moderationModel,
    }).toEqual({
      threshold: 3,
      multiplier: 2,
      cap: 48,
      perHour: 20,
      reportsPerHour: 10,
      claimMinutes: 5,
      timeoutMs: 8000,
      retentionDays: 90,
      model: undefined,
    });
  });

  it("moderation tunables ignore environment variables (remote config only)", () => {
    const c = getChatConfig({
      NODE_ENV: "test",
      MODERATION_REPORT_THRESHOLD: "99",
      CHAT_MODERATION_REPORT_THRESHOLD: "99",
      MODERATION_MODEL: "env-model",
    });
    expect(c.moderationReportThreshold).toBe(3);
    expect(c.moderationModel).toBeUndefined();
  });

  it("fails closed on an out-of-range judge timeout or claim window", async () => {
    const { chatConfigSchema } = await import("./chat-config");
    const strict = chatConfigSchema.strict();
    expect(
      strict.safeParse({
        ...DEFAULT_CHAT_CONFIG_VALUES,
        moderationJudgeTimeoutMs: 20_000,
      }).success,
    ).toBe(false);
    expect(
      strict.safeParse({
        ...DEFAULT_CHAT_CONFIG_VALUES,
        moderationClaimWindowMinutes: 0,
      }).success,
    ).toBe(false);
  });
});

describe("getChatConfigAsync moderation layer", () => {
  afterEach(() => vi.resetModules());

  it("reads moderation tunables from the remote chat section", async () => {
    vi.resetModules();
    vi.doMock("@/common/providers/EdgeConfig/EdgeConfigProvider", () => ({
      getEdgeConfig: async () => ({
        chat: { moderationReportThreshold: 7, moderationModel: "judge-model" },
      }),
    }));
    const { getChatConfigAsync } = await import("./chat-config");
    const c = await getChatConfigAsync();
    expect(c.moderationReportThreshold).toBe(7);
    expect(c.moderationModel).toBe("judge-model");
  });
});
