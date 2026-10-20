import { type Metadata } from "next";

import { AuthWall } from "@/common/components/auth-wall";
import { auth } from "@/server/auth";
import { getSupabaseAccessToken } from "@/server/auth/supabase-access-token";
import { getAssistantStatus } from "@/server/assistant/status";
import { ChatPage } from "@/modules/assistant/chat-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AssistantPage() {
  const session = await auth();
  // The assistant runs on a per-user quota, so it is members-only whatever
  // `publicData` says. The wall matches the other signed-in-only pages.
  if (!session?.user) {
    return (
      <div className="flex w-full max-w-5xl flex-col gap-6 pt-4">
        <AuthWall
          feature="the assistant"
          description="Sign in with your university account to chat with the AfterClass assistant about courses, bids and timetables."
          callbackUrl="/assistant"
        />
      </div>
    );
  }
  const status = await getAssistantStatus(
    session.user.id,
    await getSupabaseAccessToken(),
  );
  // Kill-switch: whole-route chat off → one-line notice instead of
  // the chat page. Browsing still works; sidebar links are NOT hidden.
  if (status.chatEnabled === false)
    return (
      <p className="mx-auto max-w-6xl px-4 py-10 text-sm">
        AI chat is currently disabled — browsing still works.
      </p>
    );
  return <ChatPage initialStatus={status} />;
}
