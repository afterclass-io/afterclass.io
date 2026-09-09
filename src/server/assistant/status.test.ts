import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/assistant/quota", () => ({
  getQuotaState: vi.fn(),
  checkSpendGuard: vi.fn(),
}));
vi.mock("@/server/ecfg/chat", () => ({
  getChatConfig: async () => ({ quotaPerMonth: 50, nudgeAt: 40 }),
}));
// Task 8: status.ts reads the canonical chat-config directly.
vi.mock("@/server/config/chat-config", () => ({
  getChatConfigAsync: async () => ({
    quotaPerMonth: 50,
    nudgeAt: 40,
    chatEnabled: true,
    widgetEnabled: true,
    mcpEnabled: true,
  }),
}));
vi.mock("./connected", () => ({ hasConnectedAgent: vi.fn() }));
vi.mock("./llm-status", () => ({ isLlmConfigured: vi.fn() }));
vi.mock("./consent", () => ({ getAiConsentDate: vi.fn() }));

import { checkSpendGuard, getQuotaState } from "./quota";
import { hasConnectedAgent } from "./connected";
import { isLlmConfigured } from "./llm-status";
import { getAiConsentDate } from "./consent";
import { getAssistantStatus } from "./status";

const mockedQuotaState = vi.mocked(getQuotaState);
const mockedSpend = vi.mocked(checkSpendGuard);
const mockedConnected = vi.mocked(hasConnectedAgent);
const mockedLlmConfigured = vi.mocked(isLlmConfigured);
const mockedConsent = vi.mocked(getAiConsentDate);

describe("getAssistantStatus", () => {
  beforeEach(() => {
    mockedQuotaState.mockReset();
    mockedSpend.mockReset();
    mockedConnected.mockReset();
    mockedLlmConfigured.mockReset();
    mockedConsent.mockReset();
    // Default: consented (matches T3's chat-route tests, which assume a
    // consented user unless a case says otherwise).
    mockedConsent.mockResolvedValue(null);
    // Default: key configured (matches the real .env under vitest).
    mockedLlmConfigured.mockReturnValue(true);
    mockedQuotaState.mockResolvedValue({
      used: 20,
      quota: 50,
      criticalFloor: 10,
      remaining: 30,
      isCritical: false,
      period: "2026-09",
      inputTokens: 0,
      cachedInputTokens: 0,
    });
    mockedSpend.mockResolvedValue(true);
    mockedConnected.mockResolvedValue(false);
  });

  it("reports remaining quota, spend pause, and agent status", async () => {
    const s = await getAssistantStatus("u1");
    expect(s).toEqual({
      signedIn: true,
      quota: 50,
      used: 20,
      remaining: 30,
      spendPaused: false,
      hasConnectedAgent: false,
      nudgeAt: 40,
      aiDegraded: false,
      chatEnabled: true,
      widgetEnabled: true,
      aiConsented: false,
      cacheHitRate: null,
    });
  });

  it("reports aiDegraded when no LLM key is configured", async () => {
    mockedLlmConfigured.mockReturnValue(false);
    const s = await getAssistantStatus("u1");
    expect(s.aiDegraded).toBe(true);
  });

  // Task 4: kill-switch flags surface through status (mcpEnabled stays
  // server-side — never on the status shape).
  it("surfaces chatEnabled/widgetEnabled and omits mcpEnabled", async () => {
    const s = await getAssistantStatus("u1");
    expect(s.chatEnabled).toBe(true);
    expect(s.widgetEnabled).toBe(true);
    expect(s).not.toHaveProperty("mcpEnabled");
  });

  it("reports quota exhausted when remaining is 0", async () => {
    mockedQuotaState.mockResolvedValue({
      used: 50,
      quota: 50,
      criticalFloor: 10,
      remaining: 0,
      isCritical: true,
      period: "2026-09",
      inputTokens: 0,
      cachedInputTokens: 0,
    });
    const s = await getAssistantStatus("u1");
    expect(s.spendPaused).toBe(false);
    expect(s.remaining).toBe(0);
    expect(s.used).toBe(50);
    expect(s.cacheHitRate).toBeNull();
  });

  it("reports spend paused when checkSpendGuard returns false", async () => {
    mockedSpend.mockResolvedValue(false);
    const s = await getAssistantStatus("u1");
    expect(s.spendPaused).toBe(true);
  });

  it("reports hasConnectedAgent from the Supabase grants check", async () => {
    mockedConnected.mockResolvedValue(true);
    const s = await getAssistantStatus("u1", "tok");
    expect(s.hasConnectedAgent).toBe(true);
    expect(mockedConnected).toHaveBeenCalledWith("u1", "tok");
  });

  // Task 5: aiConsented is consent-date-null → false (fail-closed), date → true.
  it("reports aiConsented:false when never consented, true once stamped", async () => {
    mockedConsent.mockResolvedValue(null);
    expect((await getAssistantStatus("u1")).aiConsented).toBe(false);
    mockedConsent.mockResolvedValue(new Date("2026-09-09T00:00:00.000Z"));
    expect((await getAssistantStatus("u1")).aiConsented).toBe(true);
    expect(mockedConsent).toHaveBeenCalledWith("u1");
  });

  it("exposes cacheHitRate as cachedInputTokens / inputTokens", async () => {
    mockedQuotaState.mockResolvedValue({
      used: 5,
      quota: 50,
      criticalFloor: 10,
      remaining: 45,
      isCritical: false,
      period: "2026-09",
      inputTokens: 1000,
      cachedInputTokens: 800,
    });
    const s = await getAssistantStatus("u1");
    expect(s.cacheHitRate).toBeCloseTo(0.8);
  });

  it("cacheHitRate is null when no input tokens yet", async () => {
    mockedQuotaState.mockResolvedValue({
      used: 1,
      quota: 50,
      criticalFloor: 10,
      remaining: 49,
      isCritical: false,
      period: "2026-09",
      inputTokens: 0,
      cachedInputTokens: 0,
    });
    const s = await getAssistantStatus("u1");
    expect(s.cacheHitRate).toBeNull();
  });
});
