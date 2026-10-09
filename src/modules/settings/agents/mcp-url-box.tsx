"use client";

import { CheckIcon } from "lucide-react";

import { useCopyToClipboard } from "@/common/hooks/use-copy-to-clipboard";

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
  // Silent on both outcomes: the check icon is the only feedback, and an
  // unavailable clipboard (non-secure context) is non-fatal.
  const { copy, copied } = useCopyToClipboard();

  return (
    <div className="mt-3 max-w-full min-w-0">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1.5 flex max-w-full min-w-0 items-center gap-2">
        <code
          className="bg-background max-w-full min-w-0 flex-1 overflow-hidden rounded-md border px-3 py-2 font-mono text-xs break-all"
          title={mcpUrl}
        >
          {mcpUrl}
        </code>
        <button
          type="button"
          onClick={() =>
            void copy(mcpUrl, { successMessage: null, errorMessage: null })
          }
          className="hover:bg-muted shrink-0 rounded-full border px-3 py-1.5 text-xs"
        >
          {copied ? <CheckIcon className="size-3.5" /> : "Copy"}
        </button>
      </div>
    </div>
  );
}
