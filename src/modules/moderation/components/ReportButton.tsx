"use client";

import { Flag, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/common/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import { useEdgeConfigs } from "@/common/hooks";
import { api, type RouterInputs } from "@/common/tools/trpc/react";

/** Shown for every report outcome that must not reveal anything. */
export const REPORT_CONFIRMATION =
  "Thanks for the report. Reported content is checked against our community guidelines.";

export type ReportButtonProps = {
  surface: RouterInputs["moderation"]["report"]["surface"];
  /** Review id, roadmap id, or timetable share token. */
  refId: string;
  /** Owner shown on the page; the button is hidden for that viewer. */
  ownerUsername?: string;
};

export function ReportButton({
  surface,
  refId,
  ownerUsername,
}: ReportButtonProps) {
  const ecfg = useEdgeConfigs();
  const { data: session, status } = useSession();
  const toastId = `report-${surface}-${refId}`;
  // No cached query to update and counts are never fetched (spec 7), so the
  // optimistic-mutation helper does not apply.
  const report = api.moderation.report.useMutation({
    onSuccess: () => toast.success(REPORT_CONFIRMATION, { id: toastId }),
    onError: (error) => {
      const code = error.data?.code;
      // Unverified gets the same confirmation: the UI never reveals why.
      if (code === "FORBIDDEN") {
        toast.success(REPORT_CONFIRMATION, { id: toastId });
      } else if (code === "TOO_MANY_REQUESTS") {
        toast.error("You're reporting too quickly. Try again later.");
      } else {
        toast.error("Reporting is unavailable right now.");
      }
    },
  });

  if (!ecfg.enableContentModeration || status !== "authenticated") return null;
  if (ownerUsername && session?.user.username === ownerUsername) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Report"
          className="h-8 rounded-full"
          disabled={report.isPending}
          data-test="report-button"
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            report.mutate({ surface, ref: refId });
          }}
        >
          {report.isPending ? <Loader2 className="animate-spin" /> : <Flag />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Report</TooltipContent>
    </Tooltip>
  );
}
