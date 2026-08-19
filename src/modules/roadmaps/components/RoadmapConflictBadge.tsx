"use client";

import type { Conflict } from "../functions/conflicts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import { cn } from "@/common/functions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoadmapConflictBadgeProps = {
  conflicts: Conflict[];
  className?: string;
};

// ---------------------------------------------------------------------------
// Severity mapping
// ---------------------------------------------------------------------------

const SEVERITY: Record<Conflict["kind"], { label: string; className: string }> =
  {
    duplicate: {
      label: "Dup",
      className: "bg-info/10 text-info border border-info/30",
    },
    "exam-clash": {
      label: "Exam",
      className: "bg-error/10 text-error border border-error/30",
    },
    "cu-overload": {
      label: "CU",
      className: "bg-warning/10 text-warning border border-warning/30",
    },
  } as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoadmapConflictBadge({
  conflicts,
  className,
}: RoadmapConflictBadgeProps) {
  if (conflicts.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {conflicts.map((c, i) => {
        const sev = SEVERITY[c.kind];
        return (
          <Tooltip key={`${c.kind}-${c.term.yearNumber}-${c.term.term}-${i}`}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] leading-none font-semibold",
                  sev.className,
                )}
              >
                {sev.label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="max-w-56 text-xs">{c.message}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
