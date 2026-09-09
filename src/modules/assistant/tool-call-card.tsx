"use client";

import { CheckIcon, ChevronDownIcon, Loader2Icon, XIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/common/functions/index";
import { toolLabel, toolStatus, type ToolPart } from "./tool-part";
import { isToolPart } from "./tool-part";

export { isToolPart };
export type { ToolPart };

function formatInput(input: unknown): string {
  if (input === undefined) return "";
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    // JSON.stringify only throws on circular refs / BigInt - fall back to a
    // safe primitive string form (satisfies no-base-to-string).
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- primitive-only fallback by design
    return String(input);
  }
}

export function ToolCallCard({
  part,
  stepIndex,
  stepTotal,
}: {
  part: ToolPart;
  stepIndex: number;
  stepTotal: number;
}) {
  const status = toolStatus(part);
  const label = toolLabel(part);
  const input = "input" in part ? part.input : undefined;
  const errorText = "errorText" in part ? part.errorText : undefined;
  const running = status === "running";
  const [open, setOpen] = useState(false);

  return (
    <div className="border-border/60 bg-muted/30 w-full max-w-[100%] overflow-hidden rounded-xl border text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {running ? (
          <Loader2Icon
            className="text-muted-foreground size-3.5 shrink-0 animate-spin"
            aria-label="Running"
          />
        ) : status === "error" ? (
          <XIcon
            className="text-destructive size-3.5 shrink-0"
            aria-label="Error"
          />
        ) : (
          <CheckIcon
            className="size-3.5 shrink-0 text-emerald-500"
            aria-label="Done"
          />
        )}
        <span className="flex-1 truncate font-medium">{label}</span>
        <span className="text-muted-foreground">
          Step {stepIndex}/{stepTotal}
        </span>
        <ChevronDownIcon
          className={cn(
            "text-muted-foreground size-3.5 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="border-border/60 border-t px-3 py-2">
          {running && typeof input === "object" && input !== null && (
            <pre className="text-muted-foreground max-h-40 overflow-auto text-[11px] whitespace-pre-wrap">
              {formatInput(input)}
            </pre>
          )}
          {!running && "output" in part && part.output !== undefined && (
            <pre className="max-h-40 overflow-auto text-[11px] whitespace-pre-wrap">
              {formatInput(part.output)}
            </pre>
          )}
          {status === "error" && errorText && (
            <p className="text-destructive">{errorText}</p>
          )}
        </div>
      )}
    </div>
  );
}
