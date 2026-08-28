import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { getSupabaseAccessToken } from "@/server/auth/supabase-access-token";
import { getAssistantStatus } from "@/server/assistant/status";
import { ChatPage } from "@/modules/assistant/chat-page";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const session = await auth();
  if (!session?.user) {
    redirect(`/account/auth/login?callbackUrl=${encodeURIComponent("/assistant")}`);
  }
  const status = await getAssistantStatus(session.user.id, await getSupabaseAccessToken());
  return <ChatPage initialStatus={status} />;
}
