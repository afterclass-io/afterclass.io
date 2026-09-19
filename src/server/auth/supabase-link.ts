import { createClient } from "@supabase/supabase-js";

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
 * only). Keeps `@/env` out of this helper so tests inject a fake client and
 * the call site (`src/server/auth/config.ts`) owns env reads.
 */
export async function exchangeGoogleIdToken(
  { idToken, accessToken, supabaseUrl, anonKey }: ExchangeGoogleIdTokenOptions,
  injected?: InjectedAuth,
): Promise<SupabaseLink> {
  const auth: InjectedAuth =
    injected ?? createClient(supabaseUrl, anonKey).auth;
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
