import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// vi.mock factories are hoisted above top-level const declarations, so the mock
// fns must be created via vi.hoisted to avoid a TDZ ("Cannot access ... before
// initialization") error.
const {
  txChatUsageFindUnique,
  txChatUsageUpsert,
  txChatUsageUpdateMany,
} = vi.hoisted(() => ({
  txChatUsageFindUnique: vi.fn() as Mock,
  txChatUsageUpsert: vi.fn() as Mock,
  txChatUsageUpdateMany: vi.fn() as Mock,
}));

const tx = {
  chatUsage: {
    findUnique: txChatUsageFindUnique,
    upsert: txChatUsageUpsert,
    updateMany: txChatUsageUpdateMany,
  },
};

vi.mock("@/server/db", () => ({
  db: {
    chatUsage: {
      findUnique: txChatUsageFindUnique,
      upsert: txChatUsageUpsert,
      updateMany: txChatUsageUpdateMany,
    },
    $transaction: (fn: (tx: Record<string, unknown>) => unknown) => fn(tx),
  },
  // reserveMessage/settleUsage run interactive $transactions on txDb (Task 9).
  txDb: {
    $transaction: (fn: (tx: Record<string, unknown>) => unknown) => fn(tx),
  },
}));
// Task 8: quota.ts reads the canonical chat-config (mocked here); the
// ecfg shim mock stays for modules that still import it transitively.
// Task 13: beginTurn reads the sync getter for inFlightStaleMs — mocked too.
vi.mock("@/server/config/chat-config", () => ({
  getChatConfig: () => ({ inFlightStaleMs: 5 * 60_000 }),
  getChatConfigAsync: async () => ({
    quotaPerMonth: 50,
    nudgeAt: 40,
    rateLimitPerMinute: 10,
    mcpRateLimitPerMinute: 60,
    maxInputTokens: 16000,
    maxOutputTokens: 1024,
    maxToolRounds: 6,
    settlementSpikeTokens: 30000,
  }),
}));
vi.mock("@/server/ecfg/chat", () => ({
  getChatConfig: async () => ({
    quotaPerMonth: 50,
    nudgeAt: 40,
    rateLimitPerMinute: 10,
    mcpRateLimitPerMinute: 60,
    maxInputTokens: 16000,
    maxOutputTokens: 1024,
    maxToolRounds: 6,
  }),
}));

import {
  beginTurn,
  checkQuota,
  endTurn,
  getQuotaState,
  refundMessage,
  reserveMessage,
  settleUsage,
} from "./quota";

describe("quota", () => {
  beforeEach(() => {
    txChatUsageFindUnique.mockReset();
    txChatUsageUpsert.mockReset();
    txChatUsageUpdateMany.mockReset();
  });

  // ---- getQuotaState token totals ----
  it("returns token totals from the usage row", async () => {
    txChatUsageFindUnique.mockResolvedValue({
      messageCount: 3,
      inputTokens: 1000,
      cachedInputTokens: 800,
    });
    const state = await getQuotaState("u1");
    expect(state.inputTokens).toBe(1000);
    expect(state.cachedInputTokens).toBe(800);
  });

  it("defaults token totals to 0 when no row exists", async () => {
    txChatUsageFindUnique.mockResolvedValue(null);
    const state = await getQuotaState("u1");
    expect(state.inputTokens).toBe(0);
    expect(state.cachedInputTokens).toBe(0);
  });

  it("defaults token totals to 0 when row has no token columns", async () => {
    txChatUsageFindUnique.mockResolvedValue({ messageCount: 1 });
    const state = await getQuotaState("u1");
    expect(state.inputTokens).toBe(0);
    expect(state.cachedInputTokens).toBe(0);
  });

  // ---- checkQuota ----
  it("allows when under quota", async () => {
    txChatUsageFindUnique.mockResolvedValue({ messageCount: 10 });
    expect(await checkQuota("u1")).toEqual({
      ok: true,
      remaining: 40,
      quota: 50,
    });
  });

  it("blocks at the quota boundary", async () => {
    txChatUsageFindUnique.mockResolvedValue({ messageCount: 50 });
    expect((await checkQuota("u1")).ok).toBe(false);
  });

  it("starts a fresh month when no row exists (lazy reset)", async () => {
    txChatUsageFindUnique.mockResolvedValue(null);
    expect(await checkQuota("u1")).toEqual({
      ok: true,
      remaining: 50,
      quota: 50,
    });
  });

  // ---- reserveMessage (atomic conditional update) ----
  it("reserveMessage creates row and returns ok on first call (atomic conditional update)", async () => {
    txChatUsageUpsert.mockResolvedValue(undefined);
    txChatUsageUpdateMany.mockResolvedValue({ count: 1 });
    txChatUsageFindUnique.mockResolvedValue({ messageCount: 1 });
    const result = await reserveMessage("u1");
    expect(result).toEqual({ ok: true, remaining: 49, quota: 50 });
    // Ensure row path: upsert with 0 then conditional updateMany with lt quota
    expect(txChatUsageUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_period: { userId: "u1", period: expect.any(String) as string },
        },
        create: expect.objectContaining({
          userId: "u1",
          messageCount: 0,
          inputTokens: 0,
          outputTokens: 0,
          cachedInputTokens: 0,
        }) as Record<string, unknown>,
        update: {},
      }) as Record<string, unknown>,
    );
    expect(txChatUsageUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "u1",
          period: expect.any(String) as string,
          messageCount: { lt: 50 },
        },
        data: { messageCount: { increment: 1 } },
      }) as Record<string, unknown>,
    );
  });

  it("reserveMessage increments existing row atomically", async () => {
    txChatUsageUpsert.mockResolvedValue(undefined);
    txChatUsageUpdateMany.mockResolvedValue({ count: 1 });
    txChatUsageFindUnique.mockResolvedValue({ messageCount: 11 });
    const result = await reserveMessage("u1");
    expect(result).toEqual({ ok: true, remaining: 39, quota: 50 });
    expect(txChatUsageUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ messageCount: { lt: 50 } }) as Record<
          string,
          unknown
        >,
      }) as Record<string, unknown>,
    );
  });

  it("reserveMessage blocks at quota and does NOT over-reserve (updateMany count 0)", async () => {
    txChatUsageUpsert.mockResolvedValue(undefined);
    txChatUsageUpdateMany.mockResolvedValue({ count: 0 });
    const result = await reserveMessage("u1");
    expect(result).toEqual({ ok: false, remaining: 0, quota: 50 });
    expect(txChatUsageUpsert).toHaveBeenCalledTimes(1);
    expect(txChatUsageUpdateMany).toHaveBeenCalledTimes(1);
    // No fresh read when blocked - remaining derived as 0
    expect(txChatUsageFindUnique).not.toHaveBeenCalled();
  });

  it("reserveMessage treats missing row as fresh period via ensure upsert", async () => {
    txChatUsageUpsert.mockResolvedValue(undefined);
    txChatUsageUpdateMany.mockResolvedValue({ count: 1 });
    txChatUsageFindUnique.mockResolvedValue({ messageCount: 1 });
    const result = await reserveMessage("u1");
    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(49);
    expect(txChatUsageUpsert).toHaveBeenCalled();
    expect(txChatUsageUpdateMany).toHaveBeenCalled();
  });

  it("reserveMessage does not over-reserve when concurrent caller already exhausted quota (updateMany count 0)", async () => {
    // Simulates race: row already at 50 when conditional update runs
    txChatUsageUpsert.mockResolvedValue(undefined);
    txChatUsageUpdateMany.mockResolvedValue({ count: 0 });
    const result = await reserveMessage("u1");
    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
    expect(txChatUsageUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ messageCount: { lt: 50 } }) as Record<
          string,
          unknown
        >,
      }) as Record<string, unknown>,
    );
  });

  it("reserveMessage re-reads fresh count for accurate remaining after concurrent increments", async () => {
    txChatUsageUpsert.mockResolvedValue(undefined);
    txChatUsageUpdateMany.mockResolvedValue({ count: 1 });
    // Fresh read returns 50 (quota exhausted after our increment) - remaining 0
    txChatUsageFindUnique.mockResolvedValue({ messageCount: 50 });
    const result = await reserveMessage("u1");
    expect(result).toEqual({ ok: true, remaining: 0, quota: 50 });
  });

  // ---- refundMessage ----
  it("refundMessage decrements the reserved count (atomic, never below 0)", async () => {
    txChatUsageUpdateMany.mockResolvedValue({ count: 1 });
    await refundMessage("u1");
    expect(txChatUsageUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "u1",
          period: expect.any(String) as string,
          messageCount: { gt: 0 },
        },
        data: { messageCount: { decrement: 1 } },
      }) as Record<string, unknown>,
    );
  });

  it("refundMessage is a no-op when nothing was reserved (no row)", async () => {
    // updateMany with gt:0 matches nothing -> { count: 0 }
    txChatUsageUpdateMany.mockResolvedValue({ count: 0 });
    await refundMessage("u1");
    expect(txChatUsageUpdateMany).toHaveBeenCalledTimes(1);
    expect(txChatUsageUpdateMany.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({ messageCount: { gt: 0 } }) as Record<
          string,
          unknown
        >,
      }) as Record<string, unknown>,
    );
  });

  // ---- settleUsage (token counts only, no spend) ----
  it("settleUsage records token counts with a single chatUsage upsert (no spend)", async () => {
    txChatUsageUpsert.mockResolvedValue(undefined);
    await settleUsage("u1", { input: 10_000, output: 1_000 });
    expect(txChatUsageUpsert).toHaveBeenCalledWith({
      where: {
        userId_period: { userId: "u1", period: expect.any(String) as string },
      },
      create: {
        userId: "u1",
        period: expect.any(String) as string,
        messageCount: 0,
        inputTokens: 10000,
        outputTokens: 1000,
        cachedInputTokens: 0,
      },
      update: {
        inputTokens: { increment: 10000 },
        outputTokens: { increment: 1000 },
        cachedInputTokens: { increment: 0 },
      },
    });
  });

  it("settleUsage records cached input tokens", async () => {
    txChatUsageUpsert.mockResolvedValue(undefined);
    await settleUsage("u1", {
      input: 10_000,
      output: 1_000,
      cachedInput: 2_000,
    });
    expect(txChatUsageUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          inputTokens: 10000,
          outputTokens: 1000,
          cachedInputTokens: 2000,
        }) as Record<string, unknown>,
        update: expect.objectContaining({
          inputTokens: { increment: 10000 },
          outputTokens: { increment: 1000 },
          cachedInputTokens: { increment: 2000 },
        }) as Record<string, unknown>,
      }) as Record<string, unknown>,
    );
  });

  // ---- beginTurn/endTurn (in-flight guard) ----
  it("beginTurn rejects a second concurrent turn and endTurn releases it", () => {
    const id = "inflight-u1";
    expect(beginTurn(id)).toBe(true);
    expect(beginTurn(id)).toBe(false);
    endTurn(id);
    expect(beginTurn(id)).toBe(true);
    endTurn(id);
  });

  it("endTurn on an unknown user is a no-op", () => {
    expect(() => endTurn("never-started")).not.toThrow();
  });
});
