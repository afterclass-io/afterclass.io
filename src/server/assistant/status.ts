import { checkSpendGuard, getQuotaState } from "./quota";
import { getChatConfig } from "@/server/ecfg/chat";
import { hasConnectedAgent } from "./connected";

export type AssistantStatus = {
  signedIn: boolean;
  quota: number;
  used: number;
  remaining: number;
  spendPaused: boolean;
  hasConnectedAgent: boolean;
  nudgeAt: number;
  // Additive observability: fraction of input tokens served from cache (0-1),
  // null before any input. Optional to keep existing story helpers that
  // construct AssistantStatus via Partial<AssistantStatus> spread type-correct
  // without requiring a migration of fixtures outside this task's ownership.
  cacheHitRate?: number | null;
};

export async function getAssistantStatus(
  userId: string,
  supabaseAccessToken?: string | null,
): Promise<AssistantStatus> {
  const connected = hasConnectedAgent(userId, supabaseAccessToken).catch(() => false);
  const [quota, spendPaused, chat] = await Promise.all([
    getQuotaState(userId),
    checkSpendGuard().then((ok) => !ok),
    getChatConfig(),
  ]);
  return {
    signedIn: true,
    quota: quota.quota,
    used: quota.used,
    remaining: quota.remaining,
    spendPaused,
    hasConnectedAgent: await connected,
    nudgeAt: chat.nudgeAt,
    cacheHitRate: quota.inputTokens > 0 ? quota.cachedInputTokens / quota.inputTokens : null,
  };
}
