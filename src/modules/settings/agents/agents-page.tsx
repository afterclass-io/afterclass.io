import { auth } from "@/server/auth";
import {
  getSupabaseAccessToken,
  getSupabaseRefreshToken,
} from "@/server/auth/supabase-access-token";
import { listUserGrants } from "@/server/supabase-consent";
import { AgentsView } from "./agents-view";

export async function AgentsPage() {
  const session = await auth();
  if (!session?.user) {
    return <AgentsView state={{ kind: "signed-out" }} />;
  }
  const token = await getSupabaseAccessToken();
  if (!token) {
    return <AgentsView state={{ kind: "no-token" }} />;
  }
  let grants;
  try {
    grants = await listUserGrants(token, await getSupabaseRefreshToken());
  } catch (err) {
    console.error("Failed to load connected agents", err);
    return <AgentsView state={{ kind: "error" }} />;
  }
  return <AgentsView state={{ kind: "ready", grants }} />;
}
