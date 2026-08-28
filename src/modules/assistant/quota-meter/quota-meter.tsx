"use client";

import { cn } from "@/common/functions/index";
import { getQuotaMeterState } from "./logic";

const BAR_COLOR: Record<ReturnType<typeof getQuotaMeterState>["level"], string> = {
  ok: "bg-emerald-500",
  low: "bg-amber-500",
  critical: "bg-red-500",
};

export function QuotaMeter({
  remaining,
  quota,
  nudgeAt,
  hasConnectedAgent,
  compact = false,
}: {
  remaining: number;
  quota: number;
  nudgeAt: number;
  hasConnectedAgent: boolean;
  compact?: boolean;
}) {
  const { level, pct } = getQuotaMeterState(remaining, quota, nudgeAt);

  return (
    <div
      className={cn(
        "border-border/60 dark:border-muted-foreground/15 flex w-full flex-col gap-1.5 border-b px-4 py-2.5",
        compact && "px-3 py-2",
      )}
      data-test="assistant-quota-meter"
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn("text-xs font-semibold", compact && "text-[11px]")}
          aria-live="polite"
        >
          {remaining} of {quota} free messages left this month
        </p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            level === "ok" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
            level === "low" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
            level === "critical" && "bg-red-500/15 text-red-600 dark:text-red-400",
          )}
        >
          {level}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={remaining}
        aria-valuemin={0}
        aria-valuemax={quota}
        aria-label="Free messages remaining this month"
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", BAR_COLOR[level])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {hasConnectedAgent ? (
        <p className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
          Unlimited - your connected agent uses your own credits.
        </p>
      ) : (
        <a
          href="/settings/agents/connect"
          data-umami-event="assistant-quota-connect-click"
          className="text-primary hover:underline text-[11px] font-semibold"
        >
          Get unlimited - connect your own agent / the AfterClass MCP App
        </a>
      )}
    </div>
  );
}
