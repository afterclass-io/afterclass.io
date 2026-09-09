"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";

export function McpRecommendation({
  hasConnectedAgent,
  onDismiss,
}: {
  hasConnectedAgent: boolean;
  onDismiss: () => void;
}) {
  // Deliberately NON-persistent: the card must reappear on every page load
  // until the user actually connects an agent (hasConnectedAgent below), so
  // "Set up MCP" stays discoverable even after the user dismisses + refreshes.
  const [dismissed, setDismissed] = useState(false);

  if (hasConnectedAgent || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  return (
    <div
      role="status"
      className="bg-muted/40 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm"
      data-umami-event="assistant-mcp-recommendation-shown"
    >
      <p>
        <span className="font-semibold">Get unlimited.</span>{" "}
        <span className="text-muted-foreground">
          Connect your own AI agent / the AfterClass MCP App and use your own
          credits.
        </span>
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href="/mcp"
          className="bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs font-semibold"
          data-umami-event="assistant-mcp-recommendation-connect"
        >
          Set up MCP
        </a>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="hover:bg-muted rounded p-1"
        >
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
