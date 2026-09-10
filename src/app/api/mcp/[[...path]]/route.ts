import { createNextHandler } from "mcp-use/next";

import { buildRouteServer } from "@/mcp/route-server";

export const runtime = "nodejs";
// 12-round tool chains need the Vercel Pro ceiling (same pin as
// src/app/api/chat/route.ts). Next.js requires a LITERAL here.
export const maxDuration = 300;

// NOTE: deliberately destructured (not delegating wrappers) so the full
// Next.js handler contract — including RouteContext/params for [[...path]] —
// passes through untouched. The unbound-method disable is a false positive:
// createNextHandler returns closures over `handle`, not prototype methods
// needing `this` (see node_modules/mcp-use/dist/next/index.js).
// eslint-disable-next-line @typescript-eslint/unbound-method -- handlers are this-independent closures, not methods
export const { GET, POST, DELETE, OPTIONS } =
  createNextHandler(buildRouteServer());
