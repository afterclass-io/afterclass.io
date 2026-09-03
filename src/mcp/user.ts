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
 * Prisma user. Email/password users have Users.id == Supabase auth.users.id.
 * Fail closed (undefined) otherwise — there is no email fallback because
 * Supabase JWTs carry no verified-email claim (see SupabaseOAuthUser: only
 * id/email/name/role/aal/amr/session_id), so an email match would be spoofable.
 */
export async function resolveMcpUser(
  auth: { user?: SupabaseOAuthUser } | null | undefined,
): Promise<SessionUser | undefined> {
  const user = auth?.user;
  if (!user?.id) return undefined;
  const byId = await db.users.findUnique({ where: { id: user.id } });
  if (byId) return toSessionUser(byId);
  return undefined;
}

/**
 * Local dev bypass: when the MCP server runs without OAuth (NODE_ENV ===
 * "development", see src/mcp/index.ts) and MCP_DEV_BYPASS is enabled, resolve
 * the caller as the seeded dev user instead of failing closed. This lets the
 * Inspector / local MCP clients exercise all 49 tools against the local
 * Postgres without a Supabase project.
 *
 * Fail-closed guarantees:
 * - Only active when NODE_ENV is unset/empty or "development" (production sets
 *   NODE_ENV=production explicitly, so the bypass is structurally impossible
 *   outside dev; `mcp-use dev` does not force NODE_ENV, it inherits the shell).
 * - Requires the explicit MCP_DEV_BYPASS=true opt-in.
 * - Only fires as a fallback when resolveMcpUser returned nothing (empty auth
 *   object) — a real token is still resolved through resolveMcpUser and still
 *   fails closed when it does not match a user.
 */
async function resolveDevBypassUser(): Promise<SessionUser | undefined> {
  const nodeEnv: string = process.env.NODE_ENV ?? "";
  if (nodeEnv !== "" && nodeEnv !== "development" && nodeEnv !== "test") return undefined;
  if (process.env.MCP_DEV_BYPASS !== "true") return undefined;
  const email = process.env.MCP_DEV_USER_EMAIL ?? "test_hash_pwd@smu.edu.sg";
  const user = await db.users.findUnique({ where: { email } });
  return user ? toSessionUser(user) : undefined;
}

/** Resolve auth and build a tRPC caller scoped to the user. Accepts the v2 RequestContext (ctx.auth.user) or a bare auth object. */
export async function buildToolContext(
  ctxOrAuth: RequestContext<SupabaseOAuthUser, true> | { auth?: { user?: SupabaseOAuthUser } } | { user?: SupabaseOAuthUser } | null | undefined,
): Promise<ToolContext | undefined> {
  const auth = (ctxOrAuth as { auth?: unknown })?.auth ?? ctxOrAuth;
  const user = (await resolveMcpUser(auth)) ?? (await resolveDevBypassUser());
  if (!user) return undefined;
  return createCallerForUser(user);
}
