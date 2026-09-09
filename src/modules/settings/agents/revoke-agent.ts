"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/server/auth";
import { getSupabaseAccessToken } from "@/server/auth/supabase-access-token";
import { listUserGrants, revokeUserGrant } from "@/server/supabase-consent";

const input = z.object({ clientId: z.string().min(1) });

export async function revokeAgent(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error("Not authenticated with Supabase");

  const parsed = input.safeParse({ clientId: formData.get("clientId") });
  if (!parsed.success) throw new Error("Invalid client id");

  const grants = await listUserGrants(token);
  const owned = grants.some((g) => g.client_id === parsed.data.clientId);
  if (!owned) throw new Error("Grant not found");

  await revokeUserGrant(parsed.data.clientId, token);
  revalidatePath("/settings/agents");
  revalidatePath("/mcp");
}
