import { MCPServer, oauthSupabaseProvider } from "mcp-use/server";

import { registerMcpUseTools } from "./register";
import { registerPrompts } from "./prompts";
import { registerResources } from "./resources";

/**
 * OAuth is only wired outside development. The mcp-use CLI sets
 * NODE_ENV="development" for `mcp:dev` and "production" for `mcp:start`, so
 * local dev runs with NO bearer middleware: the Inspector connects with zero
 * auth dance and tool calls resolve via the MCP_DEV_BYPASS dev user
 * (src/mcp/user.ts). Deployed servers keep the Supabase OAuth 2.1 flow.
 */
const isDev = process.env.NODE_ENV === "development";

const server = new MCPServer({
  name: "afterclass",
  version: "0.2.0",
  description: "afterclass.io MCP server - courses, professors, timetables, bids, roadmaps.",
  ...(isDev ? {} : { oauth: oauthSupabaseProvider() }),
});

registerMcpUseTools(server);
registerPrompts(server);
registerResources(server);

export default server;
