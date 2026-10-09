import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";

export enum ResendType {
  SIGNUP = "signup",
  EMAIL_CHANGE = "email_change",
}

export const serverSupabaseAuthOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

export const createServerSupabaseClient = () => {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serverSupabaseAuthOptions,
  );
};

export const signInWithEmail = async (email: string, password: string) => {
  const client = createServerSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: email,
    password: password,
  });
  return { data, error };
};

export const resendEmail = async (email: string, type: ResendType) => {
  const client = createServerSupabaseClient();
  const { data, error } = await client.auth.resend({
    type: type,
    email: email,
  });
  return { data, error };
};
