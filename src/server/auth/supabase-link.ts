import { createClient } from "@supabase/supabase-js";

import { serverSupabaseAuthOptions } from "@/server/supabase";

export type SupabaseLink = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  supabaseUserId: string;
};

export type ExchangeGoogleIdTokenOptions = {
  idToken: string;
  accessToken?: string;
  supabaseUrl: string;
  anonKey: string;
};

type InjectedAuth = Pick<
  ReturnType<typeof createClient>["auth"],
  "signInWithIdToken"
>;

/**
 * Exchange a Google ID token for a Supabase session (first Google sign-in
 * only). This helper never reads env values itself: the call site
 * (`src/server/auth/config.ts`) passes the URL and anon key, and tests inject
 * a fake `auth` client. The `@/server/supabase` import still loads `@/env`
 * at module load, for the shared auth options.
 */
export async function exchangeGoogleIdToken(
  { idToken, accessToken, supabaseUrl, anonKey }: ExchangeGoogleIdTokenOptions,
  injected?: InjectedAuth,
): Promise<SupabaseLink> {
  const auth: InjectedAuth =
    injected ??
    createClient(supabaseUrl, anonKey, serverSupabaseAuthOptions).auth;
  const { data, error } = await auth.signInWithIdToken({
    provider: "google",
    token: idToken,
    ...(accessToken ? { access_token: accessToken } : {}),
  });
  if (error || !data.session || !data.user)
    throw new Error(error?.message ?? "google link failed");
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? null,
    supabaseUserId: data.user.id,
  };
}
