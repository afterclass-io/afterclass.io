/**
 * Single dev-bypass gate for the MCP layer.
 *
 * `isDevBypass()` is the one place that decides whether local-dev
 * zero-auth behavior is active. Consumers (`user.ts`'s dev-user fallback,
 * `server.ts`'s OAuth omission, `dispatch.ts`'s confirm-gate skip) must all
 * delegate here instead of inlining their own NODE_ENV checks.
 *
 * Fail-closed guarantees:
 * - Only active when NODE_ENV is UNSET (undefined — a bare `mcp-use dev`
 *   inherits the shell env, which typically has no NODE_ENV at all) or
 *   EXACTLY "development". An explicitly empty NODE_ENV (""), "test", or
 *   any other value is gated: no bypass.
 * - Requires the explicit MCP_DEV_BYPASS=true opt-in (any other value —
 *   including "1", "TRUE", "" — is off).
 *
 * NODE_ENV=test is deliberately excluded: register.test.ts pins
 * "test env does NOT get the dev bypass (confirm gate still applies)" and
 * auth-context/serialization tests probe OAuth wiring per-NODE_ENV. `mcp:dev`
 * ergonomics are preserved because scripts/mcp-dev.ts sets
 * NODE_ENV=development + MCP_DEV_BYPASS=true explicitly.
 */
export function isDevBypass(): boolean {
  // NOTE: read process.env.NODE_ENV directly (no `?? ""`): under vitest,
  // vi.stubEnv(NODE_ENV, undefined) DELETES the key, so it reads undefined
  // here (unset ⇒ allowed, for bare-`mcp-use dev` shell ergonomics); an
  // explicitly empty "" and any non-development value are gated.
  const nodeEnv: string | undefined = process.env.NODE_ENV;
  return (
    (nodeEnv === undefined || nodeEnv === "development") &&
    process.env.MCP_DEV_BYPASS === "true"
  );
}
