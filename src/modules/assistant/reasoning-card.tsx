"use client";

import { useState } from "react";
import { ChevronDownIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/common/functions/index";

export function ReasoningCard({
  text,
  isStreaming = false,
}: {
  text: string;
  isStreaming?: boolean;
}) {
  // User toggle wins once set; otherwise follow the streaming state so the
  // card auto-expands live and settles collapsed when the turn finishes.
  const [userToggled, setUserToggled] = useState<boolean | null>(null);
  const blank = !text?.trim();
  const open = userToggled ?? isStreaming;
  if (blank) return null;

  return (
    <div className="border-border/60 bg-muted/30 w-full max-w-full min-w-0 overflow-hidden rounded-xl border text-xs">
      <button
        type="button"
        onClick={() => setUserToggled(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {isStreaming && (
          <Loader2Icon
            className="text-muted-foreground size-3.5 shrink-0 animate-spin"
            aria-label="Thinking"
          />
        )}
        <span
          className={cn(
            "text-muted-foreground flex-1 truncate font-medium",
            isStreaming && "animate-pulse",
          )}
        >
          {isStreaming ? "Thinking…" : open ? "Hide thinking" : "Show thinking"}
        </span>
        <ChevronDownIcon
          className={cn(
            "text-muted-foreground size-3.5 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="border-border/60 border-t px-3 py-2">
          <pre className="text-muted-foreground max-h-40 overflow-auto text-[11px] break-words whitespace-pre-wrap">
            {text}
          </pre>
        </div>
      )}
    </div>
  );
}
