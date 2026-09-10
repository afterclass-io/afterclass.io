"use client";

import { PageTitle } from "@/common/components/page-title";
import { isPlaceholderMcpUrl, MCP_PUBLIC_URL } from "./connect-links";
import { ConnectFlow } from "./connect-flow";
import { MCPUrlBox } from "./mcp-url-box";

export function ConnectPage({ mcpUrl = MCP_PUBLIC_URL }: { mcpUrl?: string }) {
  const isPlaceholder = isPlaceholderMcpUrl(mcpUrl);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <PageTitle className="text-left text-2xl font-bold tracking-tight md:text-2xl!">
          Connect your own AI agent
        </PageTitle>
        <p className="text-muted-foreground text-sm">
          Connect your own agent to afterclass.io via MCP.
        </p>
      </div>
      {isPlaceholder ? (
        <p role="alert">
          MCP connections are not configured yet. Please try again later.
        </p>
      ) : (
        <>
          <MCPUrlBox mcpUrl={mcpUrl} />
          <ConnectFlow mcpUrl={mcpUrl} />
        </>
      )}
    </div>
  );
}
