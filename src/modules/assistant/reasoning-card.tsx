"use client";

import { Loader2Icon } from "lucide-react";
import { cn } from "@/common/functions/index";
import { ExpandableCard } from "./expandable-card";

export function ReasoningCard({
  text,
  isStreaming = false,
}: {
  text: string;
  isStreaming?: boolean;
}) {
  if (!text?.trim()) return null;

  return (
    <ExpandableCard
      open={isStreaming}
      summary={
        <>
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
            {isStreaming ? "Thinking…" : "Show thinking"}
          </span>
        </>
      }
    >
      <pre className="text-muted-foreground max-h-40 overflow-auto text-[11px] break-words whitespace-pre-wrap">
        {text}
      </pre>
    </ExpandableCard>
  );
}
