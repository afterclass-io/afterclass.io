import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { getSupabaseAccessToken } from "@/server/auth/supabase-access-token";
import { getAssistantStatus } from "@/server/assistant/status";
import { ChatPage } from "@/modules/assistant/chat-page";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const session = await auth();
  if (!session?.user) {
    redirect(
      `/account/auth/login?callbackUrl=${encodeURIComponent("/assistant")}`,
    );
  }
  const status = await getAssistantStatus(
    session.user.id,
    await getSupabaseAccessToken(),
  );
  // Task 4 kill-switch: whole-route chat off → one-line notice instead of
  // the chat page. Browsing still works; sidebar links are NOT hidden.
  if (status.chatEnabled === false)
    return (
      <p className="mx-auto max-w-6xl px-4 py-10 text-sm">
        AI chat is currently disabled — browsing still works.
      </p>
    );
  return <ChatPage initialStatus={status} />;
}
