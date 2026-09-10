import { listUserGrants } from "@/server/supabase-consent";

/** Whether the user has approved any MCP client (backed by Supabase grants). */
export async function hasConnectedAgent(
  _userId: string,
  supabaseAccessToken?: string | null,
): Promise<boolean> {
  if (!supabaseAccessToken) return false;
  const grants = await listUserGrants(supabaseAccessToken);
  return grants.length > 0;
}
