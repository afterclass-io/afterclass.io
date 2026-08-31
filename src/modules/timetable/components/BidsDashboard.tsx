"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { api } from "@/common/tools/trpc/react";
import { cn } from "@/common/functions";
import { Button } from "@/common/components/button";
import { Input } from "@/common/components/input";
import { Skeleton } from "@/common/components/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/common/components/tooltip";
import { summarizeSessionBids } from "@/modules/timetable/functions/bids-summary";
import type { SessionBid } from "@/modules/timetable/functions/bids-summary";
import { formatBidAmount } from "@/modules/timetable/functions/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BidsDashboardProps = {
  acadTermId: string;
  /** All of the user's bids in this term. */
  bids: SessionBid[];
  className?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Session dashboard shown above the bids table.
 *
 * Shows: bids planned (whole term), bids secured (term), amount spent, the
 * user's e$ budget (settable inline via `userBids.upsertBudget`), and the
 * remaining e$ credits computed from it.
 */
export function BidsDashboard({ acadTermId, bids, className }: BidsDashboardProps) {
  const utils = api.useUtils();

  const budgetQuery = api.userBids.getBudget.useQuery({ acadTermId }, { staleTime: 30_000 });

  const upsertBudgetMutation = api.userBids.upsertBudget.useMutation({
    onSuccess: (data) => {
      toast.success(`Budget set to ${formatBidAmount(data.balance)}`);
      void utils.userBids.getBudget.invalidate({ acadTermId });
      setIsEditingBudget(false);
    },
    onError: (error) => {
      toast.error(`Failed to save budget: ${error.message}`);
    },
  });

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetRaw, setBudgetRaw] = useState("");

  const hasBudget = budgetQuery.data !== null && budgetQuery.data !== undefined;
  const balance = budgetQuery.data?.balance ?? 0;

  const summary = summarizeSessionBids(bids, balance);

  const handleSaveBudget = useCallback(() => {
    const parsed = Number(budgetRaw.trim());
    if (budgetRaw.trim() === "" || Number.isNaN(parsed) || parsed < 0) {
      toast.error("Enter a valid positive number");
      return;
    }
    upsertBudgetMutation.mutate({ acadTermId, balance: parsed });
  }, [budgetRaw, acadTermId, upsertBudgetMutation]);

  const handleBudgetKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleSaveBudget();
      if (e.key === "Escape") setIsEditingBudget(false);
    },
    [handleSaveBudget],
  );

  if (budgetQuery.isPending) {
    return <Skeleton className={cn("h-24 w-full rounded-lg", className)} />;
  }

  return (
    <div
      className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5", className)}
      data-test="bids-dashboard"
    >
      <StatBlock label="Secured (term)" value={String(summary.securedCount)} />
      <StatBlock label="Planned (term)" value={String(summary.plannedCount)} />

      {/* Budget — the number the user sets (pencil + inline input) */}
      <div className="border-border bg-card rounded-lg border px-3 py-2">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Budget</p>
        {hasBudget && !isEditingBudget ? (
          <div className="flex items-center gap-1.5">
            <p className="font-mono text-lg font-bold tabular-nums">{formatBidAmount(balance)}</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Edit budget"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    setBudgetRaw(String(balance));
                    setIsEditingBudget(true);
                  }}
                >
                  <Pencil className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Edit budget</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Set budget"
              aria-label="e$ budget"
              value={budgetRaw}
              onChange={(e) => setBudgetRaw(e.target.value)}
              onKeyDown={handleBudgetKeyDown}
              disabled={upsertBudgetMutation.isPending}
              className="h-7 min-w-0 flex-1 text-sm"
            />
            <Button
              size="sm"
              className="h-7 shrink-0 px-2 text-xs"
              onClick={handleSaveBudget}
              disabled={upsertBudgetMutation.isPending}
            >
              {upsertBudgetMutation.isPending && <Loader2 className="mr-1 size-3 animate-spin" />}
              Save
            </Button>
          </div>
        )}
      </div>

      <StatBlock label="Spent" value={formatBidAmount(summary.amountSpent)} />

      {/* Remaining — read-only, computed from budget − spent */}
      <div className="border-border bg-card rounded-lg border px-3 py-2">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Remaining
        </p>
        {hasBudget ? (
          <>
            <p
              className={cn(
                "font-mono text-lg font-bold tabular-nums",
                summary.remaining < 0 && "text-destructive",
              )}
            >
              {formatBidAmount(summary.remaining)}
            </p>
            <p className="text-muted-foreground text-xs">budget − spent</p>
          </>
        ) : (
          <p className="text-muted-foreground font-mono text-lg font-bold tabular-nums">—</p>
        )}
      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-card rounded-lg border px-3 py-2">
      <p className="text-muted-foreground truncate text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="font-mono text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
