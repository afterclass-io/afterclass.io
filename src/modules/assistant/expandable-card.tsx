"use client";

import type { ReactNode } from "react";
import { ChevronDownIcon } from "lucide-react";

/**
 * Shared expandable mini-card shell for assistant thread accessories
 * (reasoning, tool calls). Native <details>/<summary> gives toggle,
 * keyboard, and aria-expanded semantics with zero JS state — the `open`
 * prop only seeds initial state; the browser owns it afterwards.
 */
export function ExpandableCard({
  open = false,
  summary,
  children,
}: {
  open?: boolean;
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <details
      open={open}
      className="border-border/60 bg-muted/30 group w-full max-w-full min-w-0 overflow-hidden rounded-xl border text-xs [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left [&::marker]:hidden">
        {summary}
        <ChevronDownIcon className="text-muted-foreground size-3.5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-border/60 border-t px-3 py-2">{children}</div>
    </details>
  );
}
