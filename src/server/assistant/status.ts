import { checkQuota, checkSpendGuard } from "./quota";
import { getChatConfig } from "@/server/ecfg/chat";
import { hasConnectedAgent } from "./connected";

export async function getAssistantStatus(
  userId: string,
  supabaseAccessToken?: string | null,
) {
  const connected = hasConnectedAgent(userId, supabaseAccessToken).catch(() => false);
  const [quota, spendPaused, chat] = await Promise.all([
    checkQuota(userId),
    checkSpendGuard().then((ok) => !ok),
    getChatConfig(),
  ]);
  return {
    signedIn: true,
    quota: quota.quota,
    used: quota.quota - quota.remaining,
    remaining: quota.remaining,
    spendPaused,
    hasConnectedAgent: await connected,
    nudgeAt: chat.nudgeAt,
  };
}

export type AssistantStatus = Awaited<ReturnType<typeof getAssistantStatus>>;
