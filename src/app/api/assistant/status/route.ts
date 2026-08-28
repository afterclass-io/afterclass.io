import { auth } from "@/server/auth";
import { getSupabaseAccessToken } from "@/server/auth/supabase-access-token";
import { getAssistantStatus } from "@/server/assistant/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ signedIn: false });
  const token = await getSupabaseAccessToken();
  return Response.json(await getAssistantStatus(session.user.id, token));
}
