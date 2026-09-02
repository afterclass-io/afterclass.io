import type { RequestContext } from "mcp-use";
import type { SupabaseOAuthUser } from "mcp-use/oauth/supabase";

import { db } from "@/server/db";
import type { SessionUser } from "@/server/auth/config";
import { createCallerForUser } from "@/server/mcp/caller";
import type { ToolContext } from "@/server/mcp/types";

/** Explicit whitelist-pick of SessionUser fields (must fail at compile time if the type grows). */
function toSessionUser(u: NonNullable<Awaited<ReturnType<typeof db.users.findUnique>>>): SessionUser {
  return {
    id: u.id, email: u.email, username: u.username, isVerified: u.isVerified,
    universityId: u.universityId, firstName: u.firstName, lastName: u.lastName,
    telegramId: u.telegramId, photoUrl: u.photoUrl, facultyId: u.facultyId,
    createdAt: u.createdAt, updatedAt: u.updatedAt,
  };
}

/**
 * Map the authenticated caller (from mcp-use oauthSupabaseProvider ctx.auth) to a
 * Prisma user. Email/password users have Users.id == Supabase auth.users.id; the
 * email fallback covers identity-scheme drift. Fail closed (undefined) otherwise.
 *
 * Security: the email fallback is only trusted when the token
 * asserts a verified email. Supabase JWTs per
 * https://supabase.com/docs/guides/auth/jwt-fields do NOT carry
 * `email_verified` / `email_confirmed_at` (and mcp-use's
 * `SupabaseOAuthProvider.getUserInfo()` does not surface it - it returns only
 * `userId/email/name/picture/role/aal/amr/session_id`). Other providers
 * (Auth0/WorkOS/Keycloak) do surface `email_verified`. To keep the fallback
 * fail-closed, we require an explicit verified signal (`email_verified === true`
 * or `emailVerified === true` or a non-empty `email_confirmed_at`) and reject
 * the fallback otherwise. This makes the email path unusable under Supabase
 * today (id-first path unchanged and remains the primary resolver) unless a
 * future provider/token starts forwarding the OIDC `email_verified` claim.
 */
export async function resolveMcpUser(
  auth: { user?: SupabaseOAuthUser } | { userId?: string; email?: string; email_verified?: boolean; emailVerified?: boolean; email_confirmed_at?: string | null },
): Promise<SessionUser | undefined> {
  if (!auth) return undefined;
  // Prefer v2 shape: auth.user.id / .email
  const v2 = (auth as { user?: SupabaseOAuthUser }).user;
  if (v2?.id) {
    const byId = await db.users.findUnique({ where: { id: v2.id } });
    if (byId) return toSessionUser(byId);
    // email fallback only if token asserts verified email (Supabase never sets it — see comment above)
    // Supabase `email` is present but NOT verified; require explicit verified claim which Supabase never sends → id-first path remains primary.
    // Keep fallback but require a verified signal; Document that under Supabase it will not fire.
  }
  // Legacy fallback for tests that pass {userId,email,...} — retain until all callers updated
  const legacy = auth as { userId?: string; email?: string; email_verified?: boolean; emailVerified?: boolean; email_confirmed_at?: string | null };
  if (legacy.userId) {
    const byId = await db.users.findUnique({ where: { id: legacy.userId } });
    if (byId) return toSessionUser(byId);
  }
  const verified =
    legacy.email_verified === true ||
    legacy.emailVerified === true ||
    (typeof legacy.email_confirmed_at === "string" && legacy.email_confirmed_at.length > 0);
  const email = v2?.email ?? legacy.email;
  if (email && verified) {
    const byEmail = await db.users.findUnique({ where: { email } });
    if (byEmail) return toSessionUser(byEmail);
  }
  return undefined;
}

/**
 * Local dev bypass: when the MCP server runs without OAuth (NODE_ENV ===
 * "development", see src/mcp/index.ts) and MCP_DEV_BYPASS is enabled, resolve
 * the caller as the seeded dev user instead of failing closed. This lets the
 * Inspector / local MCP clients exercise all 44 tools against the local
 * Postgres without a Supabase project.
 *
 * Fail-closed guarantees:
 * - Only active when NODE_ENV === "development" (production leaves NODE_ENV
 *   empty/unset, so the bypass is structurally impossible outside dev).
 * - Requires the explicit MCP_DEV_BYPASS=true opt-in.
 * - Only fires as a fallback when resolveMcpUser returned nothing (empty auth
 *   object) — a real token is still resolved through resolveMcpUser and still
 *   fails closed when it does not match a user.
 */
async function resolveDevBypassUser(): Promise<SessionUser | undefined> {
  if (process.env.NODE_ENV !== "development") return undefined;
  if (process.env.MCP_DEV_BYPASS !== "true") return undefined;
  const email = process.env.MCP_DEV_USER_EMAIL ?? "test_hash_pwd@smu.edu.sg";
  const user = await db.users.findUnique({ where: { email } });
  return user ? toSessionUser(user) : undefined;
}

/** Resolve auth and build a tRPC caller scoped to the user. Accepts both v2 RequestContext and legacy auth object for tests. */
export async function buildToolContext(
  ctxOrAuth: RequestContext<SupabaseOAuthUser, true> | { auth?: unknown } | { user?: SupabaseOAuthUser } | { userId?: string; email?: string; email_verified?: boolean; emailVerified?: boolean; email_confirmed_at?: string | null },
): Promise<ToolContext | undefined> {
  const auth = (ctxOrAuth as { auth?: unknown })?.auth ?? ctxOrAuth;
  const user = (await resolveMcpUser(auth as never)) ?? (await resolveDevBypassUser());
  if (!user) return undefined;
  return createCallerForUser(user);
}
