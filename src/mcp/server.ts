// src/mcp/server.ts — the single MCPServer instance
import "server-only";

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
// Absent-vs-present split for the Supabase project ref. Returns undefined
// when NEITHER project identifier is set (missing config); otherwise the
// resolved triple. Never throws — shape errors belong to the provider
// factory (oauthSupabaseProvider), which validates them itself.
function readSupabaseRef():
  { projectId?: string; supabaseUrl?: string; jwtSecret?: string } | undefined {
  const projectId = process.env.MCP_USE_OAUTH_SUPABASE_PROJECT_ID;
  const supabaseUrl = process.env.MCP_USE_OAUTH_SUPABASE_URL;
  const jwtSecret = process.env.MCP_USE_OAUTH_SUPABASE_JWT_SECRET;
  if (!projectId && !supabaseUrl) return undefined;
  return {
    ...(projectId ? { projectId } : {}),
    ...(supabaseUrl ? { supabaseUrl } : {}),
    ...(jwtSecret ? { jwtSecret } : {}), // HS256 legacy only; omit → ES256/JWKS
  };
}

// Dev-bypass gate for OAuth omission: in dev, OAuth is omitted entirely —
// no bearer middleware, Inspector zero-auth; resolveDevBypassUser resolves
// the dev user iff the single isDevBypass() gate (./env-gate: NODE_ENV unset
// or exactly "development" + MCP_DEV_BYPASS=true) passes. `mcp:dev` sets
// both explicitly (scripts/mcp-dev.ts); `mcp-use start` forces
// NODE_ENV=production, which enables OAuth there.
// NOTE: `mcp-use dev` in a shell with no NODE_ENV inherits unset in a real
// shell (bypass allowed iff MCP_DEV_BYPASS=true — the historical
// ergonomics); under vitest, NODE_ENV defaults to "test" (fail closed →
// OAuth mounted). Use `bun run mcp:dev` for Inspector zero-auth.
//
// Only resolveOAuth() below consumes this — createServer() never constructs
// the provider directly, so import + `mcp-use build` priming stay
// credential-free.

// Thin wrapper over the mcp-use provider factory (sole construction site,
// called only by resolveOAuth(); throws propagate to the caller).
function buildSupabaseProvider(
  ref: NonNullable<ReturnType<typeof readSupabaseRef>>,
): SupabaseOAuthProvider {
  return oauthSupabaseProvider({
    ...ref,
    // audience defaults to "authenticated" — matches deployed Supabase tokens
  });
}

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

function createServer(basePath?: string): MCPServer {
  const allowedHosts = csvEnv("MCP_ALLOWED_HOSTS");
  const allowedOrigins = csvEnv("MCP_ALLOWED_ORIGINS");
  // Deferred fail-closed OAuth (Task 2b): NEVER throw here for missing
  // config — build an OAuth-free instance and refuse at serve time (below)
  // instead. Verified against mcp-use@2.3.4 source: `new MCPServer()`
  // without `oauth` only stores config (no Supabase contact); the Supabase
  // shape check lives in oauthSupabaseProvider(), which is skipped when
  // config is absent. supabaseOAuth() above keeps its verbatim fail-closed
  // throw for the direct-call path; createServer() routes through
  // resolveOAuth() so import + registration + `mcp-use build` priming all
  // succeed credential-less. No placeholder-sniffing (any
  // non-empty value flows to the provider, which validates the shape
  // itself), no silent unauthenticated serving, no new env var.
  const oauth = resolveOAuth();
  const inner =
    oauth.kind === "ok"
      ? (new MCPServer<SupabaseOAuthUser>({
          ...SERVER_META,
          oauth: oauth.provider,
          ...(basePath ? { basePath } : {}),
          ...(allowedHosts.length > 0 ? { allowedHosts } : {}),
          ...(allowedOrigins.length > 0 ? { allowedOrigins } : {}),
        }) as unknown as MCPServer)
      : new MCPServer({
          ...SERVER_META,
          ...(basePath ? { basePath } : {}),
          ...(allowedHosts.length > 0 ? { allowedHosts } : {}),
          ...(allowedOrigins.length > 0 ? { allowedOrigins } : {}),
        });
  // Deferred fail-closed OAuth (Task 2b): no usable provider + no dev
  // bypass = credential-less/misconfigured prod → refuse
  // fetch/listen/getHandler instead of serving unauthenticated. Each cause
  // keeps its own message (missing-config text vs the factory's shape
  // error) — never conflated. `mcp-use build` never serves (it only primes
  // views/skills + mounts the registry), so a credential-less checkout
  // builds fine. The flag is resolved NOW (per construction) so later env
  // mutation cannot flip the guard.
  if (oauth.kind !== "ok" && !isDevBypass())
    return refuseToServe(inner, oauth.message);
  return inner;
}

/**
 * Three-way OAuth resolution: "ok" (provider built), "missing" (neither
 * identifier set — verbatim missing-config text), or "malformed" (ref
 * present but the provider factory rejected its shape — the factory's
 * exact error, preserved for serve time). Missing vs malformed NEVER
 * conflate: each serve refusal throws its own cause's message. Neither
 * throws here — createServer() defers both to refuseToServe, while
 * supabaseOAuth() (direct-call path) keeps throwing synchronously.
 */
function resolveOAuth():
  | { kind: "ok"; provider: SupabaseOAuthProvider }
  | { kind: "missing"; message: string }
  | { kind: "malformed"; message: string } {
  const MISSING =
    "MCP_USE_OAUTH_SUPABASE_PROJECT_ID or MCP_USE_OAUTH_SUPABASE_URL is required (see .env.example)";
  if (isDevBypass()) return { kind: "missing", message: MISSING };
  const ref = readSupabaseRef();
  if (!ref) return { kind: "missing", message: MISSING };
  try {
    return { kind: "ok", provider: buildSupabaseProvider(ref) };
  } catch (e) {
    return {
      kind: "malformed",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Wrap the serve entry points to throw the credential error for this cause. */
function refuseToServe(inner: MCPServer, message?: string): MCPServer {
  const refuse = (): never => {
    throw new Error(
      message ??
        "MCP_USE_OAUTH_SUPABASE_PROJECT_ID or MCP_USE_OAUTH_SUPABASE_URL is required (see .env.example)",
    );
  };
  return new Proxy(inner, {
    get(target, prop, _receiver) {
      // Serve entries refuse: fetch (all requests), listen (socket takeover),
      // getHandler (deprecated fetch alias). __mount is deliberately NOT
      // refused: `mcp-use build` mounts the primed registry to emit the view
      // manifest without serving — mounting an OAuth-free instance performs
      // no auth and serves nothing by itself. Runtime serving without creds
      // stays impossible via fetch/listen/getHandler.
      if (prop === "fetch" || prop === "listen" || prop === "getHandler")
        return refuse;
      const value = Reflect.get(target, prop, target) as unknown;
      // Bind methods so destructured handlers keep the real `this`
      // (createNextHandler(server) reads server.fetch — refused above —
      // while tool()/__primeViews()/etc. bind here and work normally).
      // Getters likewise evaluate against the real instance (target), not
      // the proxy — MCPServer getters use private fields.
      return typeof value === "function"
        ? (value as (...args: never[]) => unknown).bind(target)
        : value;
    },
  });
}

// Lazy facade: importing this module must NEVER throw for missing Supabase
// config — createServer() builds an OAuth-free instance (refusing at serve
// time) instead of throwing, and `new MCPServer()` itself is
// credential-free. `server.tool` / `resource` / `resourceTemplate` /
// `prompt` calls made at view-tools module scope are QUEUED without building
// the singleton (`mcp-use build` executes every one of them while reading
// the ToolRef registry) and replayed in order onto the serving instance
// (see drainQueueOnto: the singleton replays through the facade on first
// serve; createRouteServer drains onto the dedicated route instance).
// Cached after first build so every importer shares one instance, same as
// before.
//
// NOTE: MCPServer methods use private-field brand checks, so the facade
// below rebinds every served method to the REAL instance (a `.bind(proxy)`
// or member call against the proxy itself would throw "Receiver must be an
// instance of class _MCPServer").
type QueuedRegistration = {
  method: "tool" | "resource" | "resourceTemplate" | "prompt";
  definition: unknown;
  callback: (...args: never[]) => unknown;
};
const queuedRegistrations: QueuedRegistration[] = [];

/**
 * Build a DEDICATED server for the embedded Next.js route
 * (`src/mcp/route-server.ts` → `buildRouteServer()`), mounted at
 * `/api/mcp` instead of mcp-use's `/mcp` default. server.fetch answers ONLY
 * its basePath exactly (`createMcpMount` → 404 otherwise), so the embedded
 * route needs its own instance — the shared `server` singleton keeps
 * "/mcp" for the standalone CLI path.
 *
 * Same lazy-OAuth contract as the singleton: credential-less builds succeed
 * (OAuth-free instance; `__mount` allowed), fetch/listen/getHandler refuse
 * credential-less without dev bypass.
 */
export function createRouteServer(): MCPServer {
  const routeServer = createServer("/api/mcp");
  // The module-scope queue (7 view-bound `server.tool` calls + anything
  // queued pre-build) belongs on THIS instance, not the CLI singleton: drain
  // it here in registration order so view-bound tools (and their view
  // bindings) land on the embedded server.
  drainQueueOnto(routeServer);
  return routeServer;
}

/**
 * Replay one queued module-scope registration onto `target`. Single dispatch
 * shared by both drain paths below so the method-to-call mapping cannot
 * diverge: `lazyServer` replays through the facade (`server`, which
 * delegates straight through once built), `createRouteServer` drains onto
 * its dedicated instance.
 */
function replayRegistration(reg: QueuedRegistration, target: MCPServer): void {
  if (reg.method === "tool")
    target.tool(
      reg.definition as Parameters<MCPServer["tool"]>[0],
      reg.callback as Parameters<MCPServer["tool"]>[1],
    );
  else if (reg.method === "resource")
    target.resource(
      reg.definition as Parameters<MCPServer["resource"]>[0],
      reg.callback as Parameters<MCPServer["resource"]>[1],
    );
  else if (reg.method === "resourceTemplate")
    target.resourceTemplate(
      reg.definition as Parameters<MCPServer["resourceTemplate"]>[0],
      reg.callback as Parameters<MCPServer["resourceTemplate"]>[1],
    );
  else
    target.prompt(
      reg.definition as Parameters<MCPServer["prompt"]>[0],
      reg.callback as Parameters<MCPServer["prompt"]>[1],
    );
}

/**
 * Drain the shared module-scope registration queue onto `target` in order
 * (view-bound `server.tool` calls queued at import time). Called with the
 * dedicated route instance by `createRouteServer` above; the singleton path
 * (`lazyServer` below) drains through the facade instead — same
 * `replayRegistration` dispatch, different target (see the NOTE there).
 * Idempotent: the queue splices on drain, so the explicit
 * `registerViewlessTools`/`registerPrompts`/`registerResources` calls in
 * `buildRouteServer()` (which run post-drain) register for real.
 */
function drainQueueOnto(target: MCPServer): void {
  for (const reg of queuedRegistrations.splice(0))
    replayRegistration(reg, target);
}

function lazyServer(): MCPServer {
  if (!cached) {
    cached = createServer();
    // Replay module-scope registrations in order through the facade.
    // NOTE: `mcp-use build` primes __primeViews/__primeSkills/__mount on the
    // ENTRY DEFAULT — `src/mcp/index.ts` line 2 (`export { server, default }
    // from "./server"`), which resolves through THIS facade, not the inner
    // instance. Replaying onto `cached` alone would leave the build holding
    // an empty server. Flush the queue by re-invoking through the facade
    // (now built, so registration calls delegate straight through) — same
    // `replayRegistration` dispatch as `drainQueueOnto`, facade as target.
    for (const reg of queuedRegistrations.splice(0))
      replayRegistration(reg, server);
  }
  return cached;
}
let cached: MCPServer | undefined;

const QUEUED_METHODS = new Set([
  "tool",
  "resource",
  "resourceTemplate",
  "prompt",
]);

export const server: MCPServer = new Proxy({} as MCPServer, {
  get(_target, prop, _receiver) {
    // Registration calls queue WITHOUT building the singleton ONLY while
    // it is unbuilt (module-scope import phase: view-tools adapters +
    // register.ts's viewless loop). Once built (first serve), `tool` etc.
    // delegate straight to the real instance — this keeps the
    // register-then-serve test flow working: `registerViewlessTools(server)`
    // after `__primeViews` (which builds) registers for real.
    // Symbol-keyed internals (Symbol("mcp-use/registerViews") used by the
    // SSR entry-wrapper, Symbol.for("mcp-use.registerSkills"), Node
    // inspect/custom symbols) ALWAYS build + delegate: they are part of the
    // build/serve machinery, never module-scope registration.
    if (!cached && typeof prop === "string" && QUEUED_METHODS.has(prop)) {
      return (definition: unknown, callback: (...args: never[]) => unknown) => {
        queuedRegistrations.push({
          method: prop as QueuedRegistration["method"],
          definition,
          callback,
        });
        // Stub ToolRef: only `.name` is consumed in-tree (register.ts
        // viewBoundNames derives the 7 view-bound names from it); builds stay
        // green via the emitted view manifest, not this object. Full ToolRef
        // fidelity (title/description passthrough) is deferred cosmetic work.
        return Object.freeze({
          name: (definition as { name: string }).name,
        });
      };
    }
    const inner = lazyServer();
    // Rebind methods to the REAL instance (private-field brand checks
    // reject the proxy as receiver). Getters (basePath/host/port/branding)
    // must be invoked WITH the real receiver — Reflect.get(inner, prop,
    // inner) — otherwise `get basePath()` throws "Receiver must be an
    // instance of class _MCPServer".
    const value = Reflect.get(inner, prop, inner) as unknown;
    return typeof value === "function"
      ? (value as (...args: never[]) => unknown).bind(inner)
      : value;
  },
  set(_target, prop, value) {
    return Reflect.set(lazyServer(), prop, value);
  },
  has(_target, prop) {
    if (typeof prop === "string" && QUEUED_METHODS.has(prop)) return true;
    return Reflect.has(lazyServer(), prop);
  },
});

export default server;
