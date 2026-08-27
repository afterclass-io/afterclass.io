import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chatConfigSchema, DEFAULT_CHAT_CONFIG, edgeConfigSchema } from "./config";

describe("chat config schema", () => {
  it("applies defaults when the chat object is missing", () => {
    const parsed = chatConfigSchema.parse(undefined);
    expect(parsed).toEqual(DEFAULT_CHAT_CONFIG);
  });

  it("applies defaults for partial remote configs", () => {
    const parsed = chatConfigSchema.parse({ quotaPerMonth: 100 });
    expect(parsed.quotaPerMonth).toBe(100);
    expect(parsed.maxOutputTokens).toBe(DEFAULT_CHAT_CONFIG.maxOutputTokens);
  });
});

describe("edge config schema", () => {
  it("parses a config without a chat key", () => {
    const parsed = edgeConfigSchema.parse({
      enableAnnouncementBanner: true,
      enableCmdkTooltip: true,
      enableReviewEventsTracking: true,
      enableReviewSort: true,
      enableReviewFilter: true,
      enableReviewReactions: true,
    });
    expect(parsed.chat).toBeUndefined();
  });
});

describe("getChatConfig env overrides", () => {
  const origEnv = { ...process.env };
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    process.env = { ...origEnv };
    vi.resetModules();
  });

  it("overrides rateLimitPerMinute from CHAT_RATE_LIMIT_PER_MINUTE", async () => {
    process.env.CHAT_RATE_LIMIT_PER_MINUTE = "99";
    vi.doMock("@/common/providers/EdgeConfig/EdgeConfigProvider", () => ({
      getEdgeConfig: async () => ({
        enableAnnouncementBanner: false,
        enableCmdkTooltip: true,
        enableReviewEventsTracking: true,
        enableReviewSort: true,
        enableReviewFilter: true,
        enableReviewReactions: true,
        chat: { ...DEFAULT_CHAT_CONFIG },
      }),
    }));
    const { getChatConfig } = await import("./chat");
    const cfg = await getChatConfig();
    expect(cfg.rateLimitPerMinute).toBe(99);
  });

  it("overrides mcpRateLimitPerMinute from CHAT_MCP_RATE_LIMIT_PER_MINUTE", async () => {
    process.env.CHAT_MCP_RATE_LIMIT_PER_MINUTE = "123";
    vi.doMock("@/common/providers/EdgeConfig/EdgeConfigProvider", () => ({
      getEdgeConfig: async () => ({
        enableAnnouncementBanner: false,
        enableCmdkTooltip: true,
        enableReviewEventsTracking: true,
        enableReviewSort: true,
        enableReviewFilter: true,
        enableReviewReactions: true,
        chat: { ...DEFAULT_CHAT_CONFIG },
      }),
    }));
    const { getChatConfig } = await import("./chat");
    const cfg = await getChatConfig();
    expect(cfg.mcpRateLimitPerMinute).toBe(123);
  });

  it("getChatWriteRateLimit respects CHAT_WRITE_RATE_LIMIT_PER_MINUTE", async () => {
    process.env.CHAT_WRITE_RATE_LIMIT_PER_MINUTE = "7";
    const { getChatWriteRateLimit } = await import("./chat");
    expect(getChatWriteRateLimit(DEFAULT_CHAT_CONFIG)).toBe(7);
    delete process.env.CHAT_WRITE_RATE_LIMIT_PER_MINUTE;
    // re-import to pick up cleared env
    vi.resetModules();
    const { getChatWriteRateLimit: get2 } = await import("./chat");
    expect(get2(DEFAULT_CHAT_CONFIG)).toBe(DEFAULT_CHAT_CONFIG.rateLimitPerMinute);
  });

  it("getRateLimitWindowMinutes defaults to 1 and respects env", async () => {
    const { getRateLimitWindowMinutes } = await import("./chat");
    expect(getRateLimitWindowMinutes()).toBe(1);
    process.env.CHAT_RATE_LIMIT_WINDOW_MINUTES = "5";
    expect(getRateLimitWindowMinutes()).toBe(5);
  });
});
