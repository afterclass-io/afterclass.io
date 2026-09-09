"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";

/**
 * Labelled, full-width, mono-spaced MCP server URL with a copy button.
 * Self-contained copied state (2s). Used on the connect page.
 */
export function MCPUrlBox({
  mcpUrl,
  label = "MCP server URL",
}: {
  mcpUrl: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable (non-secure context) - non-fatal
    }
  };

  return (
    <div className="mt-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1.5 flex items-center gap-2">
        <code
          className="bg-background min-w-0 flex-1 rounded-md border px-3 py-2 font-mono text-xs break-all"
          title={mcpUrl}
        >
          {mcpUrl}
        </code>
        <button
          type="button"
          onClick={() => void copy()}
          className="hover:bg-muted shrink-0 rounded-full border px-3 py-1.5 text-xs"
        >
          {copied ? <CheckIcon className="size-3.5" /> : "Copy"}
        </button>
      </div>
    </div>
  );
}
