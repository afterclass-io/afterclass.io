// src/mcp/server.ts — the single MCPServer instance
import { MCPServer } from "mcp-use";
import {
  oauthSupabaseProvider,
  type SupabaseOAuthUser,
} from "mcp-use/oauth/supabase";
import { isDevBypass } from "./env-gate";

/** OAuth provider produced by oauthSupabaseProvider (OAuthProvider<SupabaseOAuthUser>). */
type SupabaseOAuthProvider = ReturnType<typeof oauthSupabaseProvider>;

/**
 * NOTE: The Supabase OAuth DCR + consent flow
 * (src/app/oauth/consent/page.tsx, src/app/api/oauth/consent/route.ts,
 * src/server/supabase-consent.ts) is app-owned and UNCHANGED — it is NOT
 * mcp-use's oauthProxy / authorization-server mode. oauthSupabaseProvider
 * remains a pure resource-server verifier; the app's consent route still
 * proxies approveConsent/denyConsent via a per-call Supabase client
 * authenticated with the user's access token.
 */

// Explicit env read — the repo's env vars are MCP_USE_OAUTH_SUPABASE_* (see
// .env.example). They are passed explicitly because v2 docs state env names
// belong to the application; do NOT rely on undocumented env auto-read.
// Allowlisted raw reads (OAuth provider wiring, keys validated in env.ts;
// the dev-bypass branch itself delegates to isDevBypass()).
function supabaseOAuth(): SupabaseOAuthProvider | undefined {
  const projectId = process.env.MCP_USE_OAUTH_SUPABASE_PROJECT_ID;
  const supabaseUrl = process.env.MCP_USE_OAUTH_SUPABASE_URL;
  const jwtSecret = process.env.MCP_USE_OAUTH_SUPABASE_JWT_SECRET;
  // In dev, OAuth is omitted entirely — keep that behavior: no bearer
  // middleware, Inspector zero-auth; resolveDevBypassUser resolves the dev
  // user iff the single isDevBypass() gate (./env-gate: NODE_ENV unset or
  // exactly "development" + MCP_DEV_BYPASS=true) passes. `mcp:dev` sets both
  // explicitly (scripts/mcp-dev.ts); `mcp-use start` forces
  // NODE_ENV=production, which enables OAuth there.
  // NOTE: `mcp-use dev` in a shell with no NODE_ENV inherits unset in a real
  // shell (bypass allowed iff MCP_DEV_BYPASS=true — the historical
  // ergonomics); under vitest, NODE_ENV defaults to "test" (fail closed →
  // OAuth mounted). Use `bun run mcp:dev` for Inspector zero-auth.
  if (isDevBypass()) return undefined;
  // In prod, missing project config is a hard fail — surface a clear startup
  // error, not a cryptic 401 on the first request.
  if (!projectId && !supabaseUrl) {
    throw new Error(
      "MCP_USE_OAUTH_SUPABASE_PROJECT_ID or MCP_USE_OAUTH_SUPABASE_URL is required (see .env.example)",
    );
  }
  return oauthSupabaseProvider({
    ...(projectId ? { projectId } : {}),
    ...(supabaseUrl ? { supabaseUrl } : {}),
    ...(jwtSecret ? { jwtSecret } : {}), // HS256 legacy only; omit → ES256/JWKS
    // audience defaults to "authenticated" — matches deployed Supabase tokens
  });
}

const oauth = supabaseOAuth();

/**
 * Production Host/Origin allowlists for DNS-rebinding protection.
 *
 * Read from env (comma-separated) so deploys configure them without a code
 * change; unset by default so local dev (`mcp:dev` on localhost-class binds)
 * keeps working unmodified. Both are additive per the mcp-use contract:
 * localhost-class hostnames/origins stay allowed, and requests without an
 * `Origin` header always pass (non-browser MCP clients don't send one).
 * - `MCP_ALLOWED_HOSTS`: extra Host values, e.g. the Manufact/Fly hostname
 *   serving the MCP endpoint (the OAuth protected-resource URL must use the
 *   same host + the `/mcp` basePath).
 * - `MCP_ALLOWED_ORIGINS`: extra Origin hostnames for browser clients on
 *   non-GET/HEAD requests (the MCP wire is POST). Sandboxed view iframes
 *   send `Origin: null` on asset GETs — unaffected (GETs are never checked).
 */
function csvEnv(name: string): string[] {
  const raw = process.env[name];
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const SERVER_META = {
  name: "afterclass",
  version: "0.1.7",
  description:
    "afterclass.io MCP server - courses, professors, timetables, bids, roadmaps.",
} as const;

function createServer(): MCPServer {
  const allowedHosts = csvEnv("MCP_ALLOWED_HOSTS");
  const allowedOrigins = csvEnv("MCP_ALLOWED_ORIGINS");
  if (oauth)
    return new MCPServer<SupabaseOAuthUser>({
      ...SERVER_META,
      oauth,
      ...(allowedHosts.length > 0 ? { allowedHosts } : {}),
      ...(allowedOrigins.length > 0 ? { allowedOrigins } : {}),
    }) as unknown as MCPServer;
  return new MCPServer({
    ...SERVER_META,
    ...(allowedHosts.length > 0 ? { allowedHosts } : {}),
    ...(allowedOrigins.length > 0 ? { allowedOrigins } : {}),
  });
}

export const server: MCPServer = createServer();

export default server;
