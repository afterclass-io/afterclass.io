import { auth } from "@/server/auth";
import { getSupabaseAccessToken } from "@/server/auth/supabase-access-token";
import { getAssistantStatus } from "@/server/assistant/status";
import { getChatConfigAsync } from "@/server/config/chat-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    const chat = await getChatConfigAsync();
    return Response.json({ signedIn: false, quota: chat.quotaPerMonth });
  }
  const token = await getSupabaseAccessToken();
  return Response.json(await getAssistantStatus(session.user.id, token));
}
