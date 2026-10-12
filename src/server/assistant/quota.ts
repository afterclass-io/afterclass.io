import { db } from "@/server/db";
import {
  getChatConfigAsync as getCanonicalChatConfig,
  getChatConfig as getCanonicalChatConfigSync,
} from "@/server/config/chat-config";
import { criticalFloorFor } from "@/modules/assistant/quota-meter/logic";
import { currentMonthPeriod } from "./month";

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
  const chat = await getCanonicalChatConfig();
  const period = currentMonthPeriod();
  const row = await db.chatUsage.findUnique({
    where: { userId_period: { userId, period } },
  });
  const used = row?.messageCount ?? 0;
  const quota = chat.quotaPerMonth;
  // Mirrors the quota meter's critical zone (`getQuotaMeterState`): this many
  // remaining (or fewer) is critical. `nudgeAt` is only the "low" nudge
  // threshold, not the critical floor. Single source: criticalFloorFor.
  const criticalFloor = criticalFloorFor(quota);
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

export async function checkQuota(
  userId: string,
): Promise<{ ok: boolean; remaining: number; quota: number }> {
  const { remaining, quota } = await getQuotaState(userId);
  return { ok: remaining > 0, remaining, quota };
}

/**
 * Atomic check+reserve of a quota message slot before streaming.
 * Three pooled statements, no interactive transaction. First ensure the
 * period row exists (upsert with no-op update - no read needed), then a
 * conditional `UPDATE ... WHERE messageCount < quota` via `updateMany` whose
 * `count` tells us whether a slot was actually claimed. No `findUnique` read
 * is used for the decision, so concurrent callers cannot both read `used < quota`
 * and then both increment - only one conditional update will match (count 1,
 * the other sees count 0 and is rejected without over-reserving). The claim is
 * one statement, so a transaction adds no guarantee under Prisma's default
 * READ COMMITTED isolation, and the pooled client avoids holding a direct
 * connection for the turn.
 */
export async function reserveMessage(
  userId: string,
): Promise<{ ok: boolean; remaining: number; quota: number }> {
  const chat = await getCanonicalChatConfig();
  const period = currentMonthPeriod();
  const quota = chat.quotaPerMonth;
  // Ensure a row exists for this period; the no-op update avoids touching the
  // row when it already exists (keeps the statement idempotent).
  await db.chatUsage.upsert({
    where: { userId_period: { userId, period } },
    create: {
      userId,
      period,
      messageCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
    },
    update: {},
  });
  // Conditional increment - only succeeds when the row is still under quota.
  const result = await db.chatUsage.updateMany({
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
  const fresh = await db.chatUsage.findUnique({
    where: { userId_period: { userId, period } },
  });
  const used = fresh?.messageCount ?? quota;
  return { ok: true, remaining: Math.max(0, quota - used), quota };
}

/**
 * Settle token counts after a completed streaming response.
 * Single atomic `chatUsage` upsert (no read-then-write, no lost updates).
 * There is deliberately NO spend tracking: OpenRouter's credit budget owns
 * cost control, so no USD math happens here — only raw token counters for
 * observability (cache-hit rate, per-step logs).
 * messageCount is NOT touched - it was already reserved by reserveMessage().
 */
export async function settleUsage(
  userId: string,
  tokens: { input: number; output: number; cachedInput?: number },
): Promise<void> {
  const period = currentMonthPeriod();
  const cachedInput = tokens.cachedInput ?? 0;
  await db.chatUsage.upsert({
    where: { userId_period: { userId, period } },
    create: {
      userId,
      period,
      messageCount: 0,
      inputTokens: tokens.input,
      outputTokens: tokens.output,
      cachedInputTokens: cachedInput,
    },
    update: {
      inputTokens: { increment: tokens.input },
      outputTokens: { increment: tokens.output },
      cachedInputTokens: { increment: cachedInput },
    },
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

/**
 * In-flight turn tracking: closes the concurrent-turns overshoot window.
 * The route calls `beginTurn(userId)` before reserving a quota slot and
 * `endTurn(userId)` in settlement/refund paths; while a turn is in flight
 * for a user, a second concurrent `beginTurn` is rejected so two turns
 * cannot both hold the in-flight slot.
 * Best-effort in-process guard (single-server; Vercel may run multiple
 * instances — the reserved message slot remains the hard backstop). Always
 * pair with `endTurn` in a finally path; stale entries are treated as
 * expired after `STALE_MS` so a crashed turn cannot lock the user out
 * forever. Canonical value lives in `src/server/config/chat-config.ts`
 * (`inFlightStaleMs`), read through the getter per call so env/file
 * overrides move the window.
 */
const inFlightTurns = new Map<string, number>();

export function beginTurn(userId: string): boolean {
  const now = Date.now();
  const started = inFlightTurns.get(userId);
  const staleMs = getCanonicalChatConfigSync().inFlightStaleMs;
  if (started !== undefined && now - started < staleMs) return false;
  inFlightTurns.set(userId, now);
  return true;
}

export function endTurn(userId: string): void {
  inFlightTurns.delete(userId);
}
