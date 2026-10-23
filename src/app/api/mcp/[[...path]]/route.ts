import { createNextHandler } from "mcp-use/next";

import { buildRouteServer } from "@/mcp/route-server";
import { declineSubscriptions } from "@/mcp/subscriptions";

export const runtime = "nodejs";
// 12-round tool chains need the Vercel Pro ceiling (same pin as
// src/app/api/chat/route.ts). Next.js requires a LITERAL here.
export const maxDuration = 300;

// NOTE: deliberately destructured (not delegating wrappers) so the full
// Next.js handler contract — including RouteContext/params for [[...path]] —
// passes through untouched. The unbound-method disable is a false positive:
// createNextHandler returns closures over `handle`, not prototype methods
// needing `this` (see node_modules/mcp-use/dist/next/index.js).
/* eslint-disable @typescript-eslint/unbound-method -- handlers are this-independent closures, not methods */
const {
  GET,
  POST: mcpPost,
  DELETE,
  OPTIONS,
} = createNextHandler(buildRouteServer());
/* eslint-enable @typescript-eslint/unbound-method */

// POST declines `subscriptions/listen` and hides the change-notification
// flags from `server/discover`: a listen stream otherwise holds the function
// until the maxDuration kill (see src/mcp/subscriptions.ts). The wrapper
// forwards every other argument, so the handler contract is unchanged.
const POST = declineSubscriptions(mcpPost);

export { GET, POST, DELETE, OPTIONS };
