import "server-only";

import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";

import { env } from "@/env";

/**
 * Server-only accessor for the Supabase access token.
 *
 * The token is issued by Supabase at credentials sign-in and carried inside
 * the Auth.js session JWT (the httpOnly, encrypted cookie) - it is
 * deliberately NOT exposed on the client-visible session object
 * (`/api/auth/session`), so only server code (route handlers, server
 * components, server actions) can read it, via this accessor.
 *
 * Auth.js v5 (this repo pins `next-auth@5.0.0-beta.25`) stores the session
 * JWT in a cookie named `authjs.session-token`, prefixed with `__Secure-`
 * when served over HTTPS. The JWE encryption key is derived via HKDF from
 * `secret` + `salt`, where the salt is the cookie name - so the salt passed
 * to `decode` must match the name of the cookie actually found.
 */
export async function getSupabaseAccessToken(): Promise<string | null> {
  const store = await cookies();
  const secure = store.get("__Secure-authjs.session-token")?.value;
  const plain = store.get("authjs.session-token")?.value;
  // In production, refuse the non-__Secure- cookie. Allowlisted raw read
  // (request-security branch, not config — the ban covers config reads
  // outside env.ts/env-gate.ts/chat-config.ts).
  if (process.env.NODE_ENV === "production" && !secure) return null;
  const raw = secure ?? plain;
  if (!raw) return null;
  const salt = secure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
  // Mirror Auth.js's secret resolution (NEXTAUTH_SECRET is optional outside
  // production in the env schema; Auth.js falls back to AUTH_SECRET).
  // Allowlisted raw read (third-party fallback secret, not app config).
  const secret = env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) return null;
  // Malformed/tampered cookies decode-throw — map to null (401), not 500.
  try {
    const token = await decode({
      token: raw,
      secret,
      salt,
    });
    return token?.supabaseAccessToken ?? null;
  } catch {
    return null;
  }
}
