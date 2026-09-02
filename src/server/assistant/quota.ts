import { db } from "@/server/db";
import { getChatConfig } from "@/server/ecfg/chat";
import type { ChatConfig } from "@/server/ecfg/config";
import { currentMonthPeriod } from "./month";

export function tokensToUsd(
  chat: ChatConfig,
  tokens: { input: number; output: number; cachedInput?: number },
): number {
  const cached = tokens.cachedInput ?? 0;
  const nonCachedInput = Math.max(0, tokens.input - cached);
  return (
    (nonCachedInput * chat.priceInputPerM +
      cached * chat.priceCachedInputPerM +
      tokens.output * chat.priceOutputPerM) /
    1_000_000
  );
}

/**
 * Read-only quota state for a user in the current period ("YYYY-MM").
 * This is the single shared reader for quota - the assistant status surface
 * (`getAssistantStatus`) and the MCP `get-usage` tool both derive from it.
 */
export async function getQuotaState(userId: string): Promise<{
  used: number;
  quota: number;
  criticalFloor: number;
  remaining: number;
  isCritical: boolean;
  period: string;
  inputTokens: number;
  cachedInputTokens: number;
}> {
  const chat = await getChatConfig();
  const period = currentMonthPeriod();
  const row = await db.chatUsage.findUnique({ where: { userId_period: { userId, period } } });
  const used = row?.messageCount ?? 0;
  const quota = chat.quotaPerMonth;
  // Mirrors the quota meter's critical zone (`getQuotaMeterState`): this many
  // remaining (or fewer) is critical. `nudgeAt` is only the "low" nudge
  // threshold, not the critical floor.
  const criticalFloor = Math.max(1, Math.floor(quota * 0.2));
  const remaining = Math.max(0, quota - used);
  const isCritical = remaining <= criticalFloor;
  return {
    used,
    quota,
    criticalFloor,
    remaining,
    isCritical,
    period,
    inputTokens: row?.inputTokens ?? 0,
    cachedInputTokens: row?.cachedInputTokens ?? 0,
  };
}

export async function checkQuota(userId: string): Promise<{ ok: boolean; remaining: number; quota: number }> {
  const { remaining, quota } = await getQuotaState(userId);
  return { ok: remaining > 0, remaining, quota };
}

/**
 * Atomic check+reserve of a quota message slot before streaming.
 * Uses two DB statements inside an interactive transaction: first ensure the
 * period row exists (upsert with no-op update - no read needed), then a
 * conditional `UPDATE ... WHERE messageCount < quota` via `updateMany` whose
 * `count` tells us whether a slot was actually claimed. No `findUnique` read
 * is used for the decision, so concurrent callers cannot both read `used < quota`
 * and then both increment - only one conditional update will match (count 1,
 * the other sees count 0 and is rejected without over-reserving). This avoids
 * the lost-update / double-reserve race of the old read-then-upsert pattern
 * even under Prisma's default READ COMMITTED isolation.
 */
export async function reserveMessage(userId: string): Promise<{ ok: boolean; remaining: number; quota: number }> {
  const chat = await getChatConfig();
  const period = currentMonthPeriod();
  const quota = chat.quotaPerMonth;
  return db.$transaction(async (tx) => {
    // Ensure a row exists for this period; the no-op update avoids touching the
    // row when it already exists (keeps the statement idempotent).
    await tx.chatUsage.upsert({
      where: { userId_period: { userId, period } },
      create: { userId, period, messageCount: 0, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, spendUsd: 0 },
      update: {},
    });
    // Conditional increment - only succeeds when the row is still under quota.
    const result = await tx.chatUsage.updateMany({
      where: { userId, period, messageCount: { lt: quota } },
      data: { messageCount: { increment: 1 } },
    });
    if (result.count === 0) {
      // Row already at or over quota (including the freshly-created `0` edge
      // when `quota` is 0): no slot claimed.
      return { ok: false, remaining: 0, quota };
    }
    // One slot claimed. Re-read the fresh count for an accurate `remaining`
    // (avoids the stale-read trap of deriving remaining from the pre-increment
    // snapshot when concurrent increments raced).
    const fresh = await tx.chatUsage.findUnique({ where: { userId_period: { userId, period } } });
    const used = fresh?.messageCount ?? quota;
    return { ok: true, remaining: Math.max(0, quota - used), quota };
  });
}

/**
 * Settle token and spend counts after a completed streaming response.
 * Spend accounting is atomic: the global `chatSpend` row is ensured first
 * (upsert 0), then a conditional `updateMany WHERE totalSpendUsd < cap`
 * increments it. Concurrent callers cannot both read `totalSpendUsd` and then
 * both overwrite - the `WHERE totalSpendUsd < cap` check and the `increment`
 * happen in the same atomic statement, and the `increment` itself is additive
 * (`SET totalSpendUsd = totalSpendUsd + $1`) so no lost updates. The
 * kill-switch guard lives primarily in `checkSpendGuard` before `reserveMessage`;
 * this conditional settle just ensures we don't record further spend after the
 * cap has been tripped. ChatUsage token/spend is always updated via an
 * atomic `upsert { increment }` (no read-then-write).
 * messageCount is NOT touched - it was already reserved by reserveMessage().
 */
export async function settleUsage(
  userId: string,
  tokens: { input: number; output: number; cachedInput?: number },
): Promise<void> {
  const chat = await getChatConfig();
  const period = currentMonthPeriod();
  const spendUsd = tokensToUsd(chat, tokens);
  const cachedInput = tokens.cachedInput ?? 0;
  await db.$transaction(async (tx) => {
    // Ensure the spend row exists so the conditional increment has a target.
    await tx.chatSpend.upsert({
      where: { period },
      create: { period, totalSpendUsd: 0 },
      update: {},
    });
    // Conditional increment - only when still under cap. Atomic `WHERE ... AND increment`
    // prevents over-recording after the cap and avoids lost updates (additive).
    await tx.chatSpend.updateMany({
      where: { period, totalSpendUsd: { lt: chat.spendCapPerMonthUsd } },
      data: { totalSpendUsd: { increment: spendUsd } },
    });
    await tx.chatUsage.upsert({
      where: { userId_period: { userId, period } },
      create: { userId, period, messageCount: 0, inputTokens: tokens.input, outputTokens: tokens.output, cachedInputTokens: cachedInput, spendUsd },
      update: {
        inputTokens: { increment: tokens.input },
        outputTokens: { increment: tokens.output },
        cachedInputTokens: { increment: cachedInput },
        spendUsd: { increment: spendUsd },
      },
    });
  });
}

/**
 * Refund a reserved quota slot when a chat request fails or is aborted before
 * producing content. Mirrors the reserve path but for the failure path: the
 * reserved `messageCount` is decremented by 1 for the current period so a
 * failed turn never permanently burns quota. Uses a single atomic updateMany
 * guarded by `messageCount > 0`, so the count can never go below zero and the
 * call is a no-op when nothing was reserved (no ChatUsage row exists).
 */
export async function refundMessage(userId: string): Promise<void> {
  const period = currentMonthPeriod();
  // updateMany takes a WhereInput (scalar fields only) - the compound-unique
  // accessor userId_period is only valid for findUnique/update/delete.
  await db.chatUsage.updateMany({
    where: { userId, period, messageCount: { gt: 0 } },
    data: { messageCount: { decrement: 1 } },
  });
}

/** true = the spend kill-switch is not tripped (chat allowed). */
export async function checkSpendGuard(): Promise<boolean> {
  const chat = await getChatConfig();
  const period = currentMonthPeriod();
  const row = await db.chatSpend.findUnique({ where: { period } });
  return (row?.totalSpendUsd ?? 0) < chat.spendCapPerMonthUsd;
}
