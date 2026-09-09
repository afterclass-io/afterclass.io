import { checkSpendGuard, getQuotaState } from "./quota";
// Task 8: nudgeAt comes from the canonical chat-config (env > EdgeConfig >
// config.json > defaults) — same value, centralized source.
import { getChatConfigAsync as getChatConfig } from "@/server/config/chat-config";
import { hasConnectedAgent } from "./connected";
import { isLlmConfigured } from "./llm-status";
import { env } from "@/env";

export type AssistantStatus = {
  signedIn: boolean;
  quota: number;
  used: number;
  remaining: number;
  spendPaused: boolean;
  hasConnectedAgent: boolean;
  nudgeAt: number;
  aiDegraded: boolean;
  // Task 4 kill-switches surfaced to clients: chatEnabled gates /assistant,
  // widgetEnabled hides the widget. (mcpEnabled stays server-side — clients
  // never need it. aiConsented lands in Task 5, not here.)
  chatEnabled: boolean;
  widgetEnabled: boolean;
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
  const connected = hasConnectedAgent(userId, supabaseAccessToken).catch(
    () => false,
  );
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
    aiDegraded: !isLlmConfigured(env),
    chatEnabled: chat.chatEnabled,
    widgetEnabled: chat.widgetEnabled,
    cacheHitRate:
      quota.inputTokens > 0
        ? quota.cachedInputTokens / quota.inputTokens
        : null,
  };
}
