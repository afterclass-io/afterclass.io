import { createNextHandler } from "mcp-use/next";

import { buildRouteServer } from "@/mcp/route-server";

export const runtime = "nodejs";

// OAuth discovery for remote MCP clients (RFC 9728): the
// `/.well-known/oauth-protected-resource/*` document MUST be served from the
// same origin as the resource server, but the /api/mcp catch-all can only
// receive requests under /api/mcp. This route forwards `/.well-known/*` to
// the same mcp-use fetch handler (same instance construction as
// src/app/api/mcp/[[...path]]/route.ts): its `oauthMetadata` middleware
// answers the protected-resource document by request pathname, so no
// hand-maintained metadata copy is needed.
// eslint-disable-next-line @typescript-eslint/unbound-method -- handlers are this-independent closures, not methods (see src/app/api/mcp/[[...path]]/route.ts)
export const { GET, POST, DELETE, OPTIONS } =
  createNextHandler(buildRouteServer());
