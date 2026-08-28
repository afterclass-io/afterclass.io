"use client";

import { MCP_PUBLIC_URL } from "./connect-links";
import { ConnectFlow } from "./connect-flow";
import { MCPUrlBox } from "./mcp-url-box";

export function ConnectPage({ mcpUrl = MCP_PUBLIC_URL }: { mcpUrl?: string }) {
  return (
    <div>
      <h1>Connect your own AI agent</h1>
      <p>
        Connect Claude, ChatGPT or your own agent to afterclass.io via MCP - you&apos;ll approve
        access on the consent screen. Unlimited access on your own AI credits: your agent connects
        once, then works like the site&apos;s assistant.
      </p>
      <MCPUrlBox mcpUrl={mcpUrl} />
      <ConnectFlow mcpUrl={mcpUrl} />
    </div>
  );
}
