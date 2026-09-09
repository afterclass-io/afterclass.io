import { getQuotaState } from "./quota";
import { getChatConfigAsync as getChatConfig } from "@/server/config/chat-config";
import { getAiConsentDate } from "./consent";
import { hasConnectedAgent } from "./connected";
import { isLlmConfigured } from "./llm-status";
import { env } from "@/env";

export type AssistantStatus = {
  signedIn: boolean;
  quota: number;
  used: number;
  remaining: number;
  hasConnectedAgent: boolean;
  nudgeAt: number;
  aiDegraded: boolean;
  // Kill-switches surfaced to clients: chatEnabled gates /assistant,
  // widgetEnabled hides the widget. (mcpEnabled stays server-side — clients
  // never need it.) aiConsented (NULL consent → false, fail-closed)
  // drives the block-and-reask notice in the widget + /assistant.
  chatEnabled: boolean;
  widgetEnabled: boolean;
  aiConsented: boolean;
  // Additive observability: fraction of input tokens served from cache (0-1),
  // null before any input. Optional to keep existing story helpers that
  // construct AssistantStatus via Partial<AssistantStatus> spread type-correct
  // without requiring a migration of fixtures.
  cacheHitRate?: number | null;
};

export async function getAssistantStatus(
  userId: string,
  supabaseAccessToken?: string | null,
): Promise<AssistantStatus> {
  const connected = hasConnectedAgent(userId, supabaseAccessToken).catch(
    () => false,
  );
  const [quota, chat, consentDate] = await Promise.all([
    getQuotaState(userId),
    getChatConfig(),
    getAiConsentDate(userId),
  ]);
  return {
    signedIn: true,
    quota: quota.quota,
    used: quota.used,
    remaining: quota.remaining,
    hasConnectedAgent: await connected,
    nudgeAt: chat.nudgeAt,
    aiDegraded: !isLlmConfigured(env),
    chatEnabled: chat.chatEnabled,
    widgetEnabled: chat.widgetEnabled,
    aiConsented: consentDate !== null,
    cacheHitRate:
      quota.inputTokens > 0
        ? quota.cachedInputTokens / quota.inputTokens
        : null,
  };
}
