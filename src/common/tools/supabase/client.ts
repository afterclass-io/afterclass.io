/**
 * Browser-scoped Supabase client for client components only.
 * Server code must use createServerSupabaseClient from @/server/supabase.
 */
import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";
import { instrumentSupabase } from "./instrument";

export const supabaseBrowser = instrumentSupabase(
  createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
);
