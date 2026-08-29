"use client";

import { PageTitle } from "@/common/components/page-title";
import { MCP_PUBLIC_URL } from "./connect-links";
import { ConnectFlow } from "./connect-flow";
import { MCPUrlBox } from "./mcp-url-box";

export function ConnectPage({ mcpUrl = MCP_PUBLIC_URL }: { mcpUrl?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <PageTitle className="text-left text-2xl md:text-2xl! font-bold tracking-tight">
          Connect your own AI agent
        </PageTitle>
        <p className="text-muted-foreground text-sm">
          Connect Claude, ChatGPT or your own agent to afterclass.io via MCP — you&apos;ll approve
          access on the consent screen. Unlimited access on your own AI credits: your agent connects
          once, then works like the site&apos;s assistant.
        </p>
      </div>
      <MCPUrlBox mcpUrl={mcpUrl} />
      <ConnectFlow mcpUrl={mcpUrl} />
    </div>
  );
}
