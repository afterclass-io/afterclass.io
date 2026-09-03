// src/mcp/server.ts — the single MCPServer instance
import { MCPServer } from "mcp-use";
import { oauthSupabaseProvider, type SupabaseOAuthUser } from "mcp-use/oauth/supabase";

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
function supabaseOAuth(): SupabaseOAuthProvider | undefined {
  const projectId = process.env.MCP_USE_OAUTH_SUPABASE_PROJECT_ID;
  const supabaseUrl = process.env.MCP_USE_OAUTH_SUPABASE_URL;
  const jwtSecret = process.env.MCP_USE_OAUTH_SUPABASE_JWT_SECRET;
  // In dev, Task 1 omitted oauth entirely — keep that behavior: no bearer
  // middleware, Inspector zero-auth; resolveDevBypassUser resolves the dev
  // user iff MCP_DEV_BYPASS=true (see src/mcp/user.ts). `mcp-use dev` does
  // not force NODE_ENV — it inherits the shell — so treat unset/empty the
  // same as development here (must match the bypass gate in user.ts).
  // `mcp-use start` forces NODE_ENV=production, which enables OAuth there.
  const nodeEnv: string = process.env.NODE_ENV ?? "";
  if (nodeEnv === "" || nodeEnv === "development" || nodeEnv === "test") return undefined;
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

const SERVER_META = {
  name: "afterclass",
  version: "0.2.0",
  description: "afterclass.io MCP server - courses, professors, timetables, bids, roadmaps.",
} as const;

function createServer(): MCPServer {
  if (oauth) return new MCPServer<SupabaseOAuthUser>({ ...SERVER_META, oauth }) as unknown as MCPServer;
  return new MCPServer(SERVER_META);
}

export const server: MCPServer = createServer();

export default server;
