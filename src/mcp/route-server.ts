import "server-only";

import type { MCPServer } from "mcp-use";

import { createRouteServer } from "./server";
// View-bound ToolRefs self-register at module scope (server.tool calls
// QUEUE pre-build and replay on first serve); they must be IMPORTED before
// registerViewlessTools runs so the queue holds all 7 view-bound tools when
// register.ts derives viewBoundNames + registers the remaining 43 (same
// import side-effects as src/mcp/index.ts:5-11).
import "./view-tools/search-courses";
import "./view-tools/get-timetable-calendar-link";
import "./view-tools/my-bid-plan";
import "./view-tools/get-my-roadmap";
import "./view-tools/get-course-reviews";
import "./view-tools/explore-bid-options";
import "./view-tools/get-my-timetable-detail";
import { registerViewlessTools } from "./register";
import { registerPrompts } from "./prompts";
import { registerResources } from "./resources";

/**
 * Build the MCP server instance served by the Next.js embedded route
 * (`src/app/api/mcp/[[...path]]/route.ts`) via `createNextHandler`.
 *
 * Same instance + same registration order as the standalone CLI path
 * (`src/mcp/index.ts`): view-bound ToolRefs (module-scope side-effect
 * imports above — do not re-register them), then viewless tools, then
 * prompts, then resources.
 *
 * `basePath: "/api/mcp"`: the Next.js catch-all mounts the handler at
 * /api/mcp (not mcp-use's "/mcp" default). server.fetch answers ONLY its
 * basePath exactly (`createMcpMount` → 404 otherwise), so the default would
 * 404 every embedded request.
 */
export function buildRouteServer(): MCPServer {
  // Dedicated instance with the embedded basePath: the Next.js catch-all
  // mounts the handler at /api/mcp (not mcp-use's "/mcp" default).
  // server.fetch answers ONLY its basePath exactly (`createMcpMount` → 404
  // otherwise), so the default would 404 every embedded request. The CLI
  // singleton keeps "/mcp" — do not touch it here.
  const server = createRouteServer();
  registerViewlessTools(server);
  registerPrompts(server);
  registerResources(server);
  return server;
}
