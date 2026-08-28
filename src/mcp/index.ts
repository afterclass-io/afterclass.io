import { MCPServer, oauthSupabaseProvider } from "mcp-use/server";

import { registerMcpUseTools } from "./register";
import { registerPrompts } from "./prompts";
import { registerResources } from "./resources";

const server = new MCPServer({
  name: "afterclass",
  version: "0.2.0",
  description: "afterclass.io MCP server - courses, professors, timetables, bids, roadmaps.",
  oauth: oauthSupabaseProvider(),
});

registerMcpUseTools(server);
registerPrompts(server);
registerResources(server);

export default server;
