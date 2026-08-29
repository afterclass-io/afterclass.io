import { createClient } from "@supabase/supabase-js";

import { env } from "@/env";

/**
 * Per-call Supabase client authenticated as the user via their access token.
 *
 * The app's shared `supabase` client (`@/server/supabase`) is an anonymous,
 * browser-scoped client. The Supabase OAuth-server methods must run as the
 * signed-in user, so we build a fresh client per call with the user's access
 * token (carried in the NextAuth session, see `src/server/auth/config.ts`).
 *
 * NOTE: the Supabase access token in the NextAuth JWT is captured at
 * sign-in and expires after ~1h. Stale tokens surface a Supabase auth error
 * (e.g. the consent route returns 400); recommend the user re-login. A
 * refresh-token flow is out of scope and tracked for later.
 */
async function userClient(accessToken: string) {
  const client = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    },
  );
  // The supabase-js OAuth methods (getAuthorizationDetails / approve /
  // deny / listGrants / revokeGrant) read the active session from the
  // client's stored state (`_useSession`), NOT the Authorization header -
  // without a stored session they throw `AuthSessionMissingError`
  // ("Auth session missing!"). Register the access token as the active
  // session so the OAuth-server calls run as this user.
  //
  // `setSession` requires a non-empty `refresh_token` (it throws
  // `AuthSessionMissingError` otherwise). The NextAuth JWT only carries the
  // access token - a refresh-token flow is tracked separately - so pass a
  // sentinel. It is only used if the access token has already expired, which
  // a per-call consent client (fresh ~1h token) never needs.
  const { error } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: "refresh_token_not_used",
  });
  if (error) throw error;
  return client;
}

/**
 * Result of `getConsentDetails`, discriminated on `status` so callers can
 * branch instead of receiving a degenerate details object:
 * - `"details"` - the user must consent; render the consent form.
 * - `"already_consented"` - the user already consented; redirect immediately.
 */
export type ConsentDetailsResult =
  | { status: "details"; client: { name: string; id?: string }; client_id?: string; scope?: string; redirect_uri: string }
  | { status: "already_consented"; redirectUrl: string };

export async function approveConsent(authorizationId: string, accessToken: string) {
  const { data, error } = await (await userClient(accessToken)).auth.oauth.approveAuthorization(
    authorizationId,
  );
  if (error || !data?.redirect_url) throw new Error(error?.message ?? "approve failed");
  return { redirectUrl: data.redirect_url };
}

export async function denyConsent(authorizationId: string, accessToken: string) {
  const { data, error } = await (await userClient(accessToken)).auth.oauth.denyAuthorization(
    authorizationId,
  );
  if (error || !data?.redirect_url) throw new Error(error?.message ?? "deny failed");
  return { redirectUrl: data.redirect_url };
}

export async function getConsentDetails(
  authorizationId: string,
  accessToken: string,
): Promise<ConsentDetailsResult> {
  const { data, error } = await (await userClient(accessToken)).auth.oauth.getAuthorizationDetails(
    authorizationId,
  );
  if (error || !data) throw new Error(error?.message ?? "invalid authorization request");
  // `data` is either full authorization details (needs consent) or a redirect
  // (user already consented). Surface both as a discriminated result so callers
  // can branch instead of receiving a degenerate details object.
  if ("redirect_url" in data) {
    return { status: "already_consented", redirectUrl: data.redirect_url };
  }
  return {
    status: "details",
    client: { name: data.client.name, id: (data.client as { id?: string }).id },
    client_id: (data as { client_id?: string }).client_id,
    scope: data.scope,
    redirect_uri: data.redirect_uri,
  };
}

export interface UserGrant {
  id: string;
  client_id: string;
  client_name?: string;
  scopes: string[];
}

export async function listUserGrants(accessToken: string): Promise<UserGrant[]> {
  const { data, error } = await (await userClient(accessToken)).auth.oauth.listGrants();
  // Consumers must surface failures, not show an empty list.
  if (error) throw new Error(error.message);
  // The grant object nests client info under `client` (no top-level id).
  return (data ?? []).map((grant) => ({
    id: grant.client.id,
    client_id: grant.client.id,
    client_name: grant.client.name,
    scopes: grant.scopes,
  }));
}

export async function revokeUserGrant(clientId: string, accessToken: string): Promise<void> {
  const { error } = await (await userClient(accessToken)).auth.oauth.revokeGrant({ clientId });
  if (error) throw new Error(error.message);
}
