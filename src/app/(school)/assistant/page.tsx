import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { getAssistantStatus } from "@/server/assistant/status";
import { ChatPage } from "@/modules/assistant/chat-page";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const session = await auth();
  if (!session?.user) {
    redirect(`/account/auth/login?callbackUrl=${encodeURIComponent("/assistant")}`);
  }
  const status = await getAssistantStatus(session.user.id, session.user.supabaseAccessToken);
  return <ChatPage initialStatus={status} />;
}
