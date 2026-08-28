import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/assistant/quota", () => ({
  checkQuota: vi.fn(),
  checkSpendGuard: vi.fn(),
}));
vi.mock("@/server/ecfg/chat", () => ({
  getChatConfig: async () => ({ quotaPerMonth: 50, nudgeAt: 40 }),
}));
vi.mock("./connected", () => ({ hasConnectedAgent: vi.fn() }));

import { checkQuota, checkSpendGuard } from "./quota";
import { hasConnectedAgent } from "./connected";
import { getAssistantStatus } from "./status";

const mockedQuota = vi.mocked(checkQuota);
const mockedSpend = vi.mocked(checkSpendGuard);
const mockedConnected = vi.mocked(hasConnectedAgent);

describe("getAssistantStatus", () => {
  beforeEach(() => {
    mockedQuota.mockReset(); mockedSpend.mockReset(); mockedConnected.mockReset();
    mockedQuota.mockResolvedValue({ ok: true, remaining: 30, quota: 50 });
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
    });
  });

  it("reports quota exhausted when checkQuota returns ok:false", async () => {
    mockedQuota.mockResolvedValue({ ok: false, remaining: 0, quota: 50 });
    const s = await getAssistantStatus("u1");
    expect(s.spendPaused).toBe(false);
    expect(s.remaining).toBe(0);
    expect(s.used).toBe(50);
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
});
