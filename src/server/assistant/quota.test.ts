import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// vi.mock factories are hoisted above top-level const declarations, so the mock
// fns must be created via vi.hoisted to avoid a TDZ ("Cannot access ... before
// initialization") error.
const {
  txChatUsageFindUnique,
  txChatUsageUpsert,
  txChatUsageUpdateMany,
  txChatSpendFindUnique,
  txChatSpendUpsert,
  txChatSpendUpdateMany,
} = vi.hoisted(() => ({
  txChatUsageFindUnique: vi.fn() as Mock,
  txChatUsageUpsert: vi.fn() as Mock,
  txChatUsageUpdateMany: vi.fn() as Mock,
  txChatSpendFindUnique: vi.fn() as Mock,
  txChatSpendUpsert: vi.fn() as Mock,
  txChatSpendUpdateMany: vi.fn() as Mock,
}));

const tx = {
  chatUsage: { findUnique: txChatUsageFindUnique, upsert: txChatUsageUpsert, updateMany: txChatUsageUpdateMany },
  chatSpend: { findUnique: txChatSpendFindUnique, upsert: txChatSpendUpsert, updateMany: txChatSpendUpdateMany },
};

vi.mock("@/server/db", () => ({
  db: {
    chatUsage: { findUnique: txChatUsageFindUnique, upsert: txChatUsageUpsert, updateMany: txChatUsageUpdateMany },
    chatSpend: { findUnique: txChatSpendFindUnique, upsert: txChatSpendUpsert, updateMany: txChatSpendUpdateMany },
    $transaction: (fn: (tx: Record<string, unknown>) => unknown) => fn(tx),
  },
}));
vi.mock("@/server/ecfg/chat", () => ({
  getChatConfig: async () => ({
    quotaPerMonth: 50, nudgeAt: 40, rateLimitPerMinute: 10, mcpRateLimitPerMinute: 60,
    spendCapPerMonthUsd: 20, maxInputTokens: 16000, maxOutputTokens: 1024, maxToolRounds: 6,
    priceInputPerM: 0.14, priceCachedInputPerM: 0.014, priceOutputPerM: 0.28,
  }),
}));

import { checkQuota, checkSpendGuard, getQuotaState, refundMessage, reserveMessage, settleUsage, tokensToUsd } from "./quota";
import { DEFAULT_CHAT_CONFIG } from "@/server/ecfg/config";

describe("quota", () => {
  beforeEach(() => {
    txChatUsageFindUnique.mockReset(); txChatUsageUpsert.mockReset();
    txChatUsageUpdateMany.mockReset();
    txChatSpendFindUnique.mockReset(); txChatSpendUpsert.mockReset(); txChatSpendUpdateMany.mockReset();
  });

  // ---- getQuotaState token totals ----
  it("returns token totals from the usage row", async () => {
    txChatUsageFindUnique.mockResolvedValue({ messageCount: 3, inputTokens: 1000, cachedInputTokens: 800 });
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
    expect(await checkQuota("u1")).toEqual({ ok: true, remaining: 40, quota: 50 });
  });

  it("blocks at the quota boundary", async () => {
    txChatUsageFindUnique.mockResolvedValue({ messageCount: 50 });
    expect((await checkQuota("u1")).ok).toBe(false);
  });

  it("starts a fresh month when no row exists (lazy reset)", async () => {
    txChatUsageFindUnique.mockResolvedValue(null);
    expect(await checkQuota("u1")).toEqual({ ok: true, remaining: 50, quota: 50 });
  });

  // ---- tokensToUsd ----
  it("computes spend from token counts", () => {
    // 10000*0.14 + 1000*0.28 over 1e6 is 0.0016800000000000003 (not exactly
    // 0.00168), so use toBeCloseTo with 5 dp for discrimination.
    expect(tokensToUsd(DEFAULT_CHAT_CONFIG, { input: 10_000, output: 1_000 })).toBeCloseTo(0.00168, 5);
  });

  it("computes spend with cached input at 10x discount", () => {
    // (8000*0.14 + 2000*0.014 + 1000*0.28)/1e6 = (1120+28+280)/1e6 = 0.001428
    expect(tokensToUsd(DEFAULT_CHAT_CONFIG, { input: 10_000, output: 1_000, cachedInput: 2_000 })).toBeCloseTo(0.001428, 5);
  });

  it("clamps cachedInput exceeding input to 0 non-cached", () => {
    // cachedInput > input => nonCached = 0, cost = cached*0.014 + output*0.28
    expect(tokensToUsd(DEFAULT_CHAT_CONFIG, { input: 1_000, output: 0, cachedInput: 5_000 })).toBeCloseTo(5000 * 0.014 / 1_000_000, 5);
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
        where: { userId_period: { userId: "u1", period: expect.any(String) as string } },
        create: expect.objectContaining({ userId: "u1", messageCount: 0, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, spendUsd: 0 }) as Record<string, unknown>,
        update: {},
      }) as Record<string, unknown>,
    );
    expect(txChatUsageUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1", period: expect.any(String) as string, messageCount: { lt: 50 } },
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
      expect.objectContaining({ where: expect.objectContaining({ messageCount: { lt: 50 } }) as Record<string, unknown> }) as Record<string, unknown>,
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
      expect.objectContaining({ where: expect.objectContaining({ messageCount: { lt: 50 } }) as Record<string, unknown> }) as Record<string, unknown>,
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
        where: expect.objectContaining({ messageCount: { gt: 0 } }) as Record<string, unknown>,
      }) as Record<string, unknown>,
    );
  });

  // ---- settleUsage (atomic spend accounting) ----
  it("settleUsage records token/spend atomically via conditional updateMany when under cap", async () => {
    txChatSpendUpsert.mockResolvedValue(undefined);
    txChatSpendUpdateMany.mockResolvedValue({ count: 1 });
    txChatUsageUpsert.mockResolvedValue(undefined);
    await settleUsage("u1", { input: 10_000, output: 1_000 });
    // ChatSpend ensure row
    expect(txChatSpendUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { period: expect.any(String) as string },
        create: { period: expect.any(String) as string, totalSpendUsd: 0 },
        update: {},
      }) as Record<string, unknown>,
    );
    // Conditional increment under cap
    expect(txChatSpendUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { period: expect.any(String) as string, totalSpendUsd: { lt: 20 } },
        data: { totalSpendUsd: { increment: expect.closeTo(0.00168, 5) as number } },
      }) as Record<string, unknown>,
    );
    // ChatUsage upsert should be called with messageCount: 0 (not incremented)
    expect(txChatUsageUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: "u1",
          messageCount: 0,
          inputTokens: 10000,
          outputTokens: 1000,
          cachedInputTokens: 0,
          spendUsd: expect.closeTo(0.00168, 5) as number,
        }) as Record<string, unknown>,
        update: expect.objectContaining({
          inputTokens: { increment: 10000 },
          outputTokens: { increment: 1000 },
          cachedInputTokens: { increment: 0 },
          spendUsd: { increment: expect.closeTo(0.00168, 5) as number },
        }) as Record<string, unknown>,
      }) as Record<string, unknown>,
    );
  });

  it("settleUsage records cached input tokens with discounted spend", async () => {
    txChatSpendUpsert.mockResolvedValue(undefined);
    txChatSpendUpdateMany.mockResolvedValue({ count: 1 });
    txChatUsageUpsert.mockResolvedValue(undefined);
    await settleUsage("u1", { input: 10_000, output: 1_000, cachedInput: 2_000 });
    const expectedSpend = ((8000 * 0.14 + 2000 * 0.014 + 1000 * 0.28) / 1_000_000);
    expect(txChatUsageUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          inputTokens: 10000,
          outputTokens: 1000,
          cachedInputTokens: 2000,
          spendUsd: expect.closeTo(expectedSpend, 5) as number,
        }) as Record<string, unknown>,
        update: expect.objectContaining({
          inputTokens: { increment: 10000 },
          outputTokens: { increment: 1000 },
          cachedInputTokens: { increment: 2000 },
          spendUsd: { increment: expect.closeTo(expectedSpend, 5) as number },
        }) as Record<string, unknown>,
      }) as Record<string, unknown>,
    );
  });

  it("settleUsage does not record spend when at cap (conditional updateMany matches 0)", async () => {
    txChatSpendUpsert.mockResolvedValue(undefined);
    txChatSpendUpdateMany.mockResolvedValue({ count: 0 });
    txChatUsageUpsert.mockResolvedValue(undefined);
    await settleUsage("u1", { input: 5_000, output: 500 });
    expect(txChatSpendUpsert).toHaveBeenCalled();
    expect(txChatSpendUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ totalSpendUsd: { lt: 20 } }) as Record<string, unknown> }) as Record<string, unknown>,
    );
    // ChatUsage upsert is still called (usage accounting independent of spend cap)
    expect(txChatUsageUpsert).toHaveBeenCalled();
  });

  it("settleUsage concurrent increments are additive and not lost (updateMany increment)", async () => {
    txChatSpendUpsert.mockResolvedValue(undefined);
    txChatSpendUpdateMany.mockResolvedValue({ count: 1 });
    txChatUsageUpsert.mockResolvedValue(undefined);
    await settleUsage("u1", { input: 1_000, output: 500 });
    expect(txChatSpendUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { totalSpendUsd: { increment: expect.any(Number) as number } } }) as Record<string, unknown>,
    );
    // increment is additive, not a read-then-write overwrite
    const call = txChatSpendUpdateMany.mock.calls[0]?.[0] as Record<string, unknown>;
    expect((call.data as Record<string, unknown>).totalSpendUsd).toEqual(expect.objectContaining({ increment: expect.any(Number) as number }));
  });

  // ---- checkSpendGuard ----
  it("spend guard blocks at the cap", async () => {
    txChatSpendFindUnique.mockResolvedValue({ totalSpendUsd: 20 });
    expect(await checkSpendGuard()).toBe(false);
  });

  it("spend guard allows when under cap", async () => {
    txChatSpendFindUnique.mockResolvedValue({ totalSpendUsd: 10 });
    expect(await checkSpendGuard()).toBe(true);
  });

  it("spend guard allows when no row exists", async () => {
    txChatSpendFindUnique.mockResolvedValue(null);
    expect(await checkSpendGuard()).toBe(true);
  });
});
