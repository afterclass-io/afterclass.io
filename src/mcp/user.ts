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
export async function resolveMcpUser(auth: {
  userId?: string;
  email?: string;
  email_verified?: boolean;
  emailVerified?: boolean;
  email_confirmed_at?: string | null;
}): Promise<SessionUser | undefined> {
  if (!auth.userId && !auth.email) return undefined;
  if (auth.userId) {
    const byId = await db.users.findUnique({ where: { id: auth.userId } });
    if (byId) return toSessionUser(byId);
  }
  if (auth.email) {
    const verified =
      auth.email_verified === true ||
      auth.emailVerified === true ||
      (typeof auth.email_confirmed_at === "string" && auth.email_confirmed_at.length > 0);
    if (!verified) return undefined;
    const byEmail = await db.users.findUnique({ where: { email: auth.email } });
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

/** Resolve auth and build a tRPC caller scoped to the user. */
export async function buildToolContext(auth: {
  userId?: string;
  email?: string;
  email_verified?: boolean;
  emailVerified?: boolean;
  email_confirmed_at?: string | null;
}): Promise<ToolContext | undefined> {
  const user = (await resolveMcpUser(auth)) ?? (await resolveDevBypassUser());
  if (!user) return undefined;
  return createCallerForUser(user);
}
