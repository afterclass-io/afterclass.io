"use client";

import { Button } from "@/common/components/button";
import { PageTitle } from "@/common/components/page-title";
import { ConnectFlow } from "./connect-flow";
import { MCPUrlBox } from "./mcp-url-box";

export function ConnectPage({ mcpUrl }: { mcpUrl: string }) {
  return (
    <div className="flex max-w-full min-w-0 flex-col gap-4">
      <div>
        <PageTitle className="text-left text-2xl font-bold tracking-tight md:text-2xl!">
          Connect your own AI agent
        </PageTitle>
        <p className="text-muted-foreground text-sm">
          Connect your own agent to afterclass.io via MCP.
        </p>
      </div>
      <MCPUrlBox mcpUrl={mcpUrl} />
      <ConnectFlow mcpUrl={mcpUrl} />
      <p className="text-muted-foreground text-sm">
        Already connected?{" "}
        <Button asChild variant="link" className="h-auto p-0 text-sm">
          <a href="/settings/agents">Manage connected agents</a>
        </Button>
      </p>
    </div>
  );
}
