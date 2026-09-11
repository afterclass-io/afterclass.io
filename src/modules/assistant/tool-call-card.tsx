"use client";

import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { toolLabel, toolStatus, type ToolPart } from "./tool-part";
import { isToolPart } from "./tool-part";
import { ExpandableCard } from "./expandable-card";

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

  return (
    <ExpandableCard
      summary={
        <>
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
        </>
      }
    >
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
    </ExpandableCard>
  );
}
