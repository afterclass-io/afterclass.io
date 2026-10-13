"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";

export const DisclosureDisclaimer = () => (
  <Tooltip delayDuration={300}>
    <TooltipTrigger asChild>
      <span className="text-muted-foreground hover:text-foreground inline-flex cursor-help items-center gap-1.5 transition-colors">
        <Info size={14} className="shrink-0" />
        <span className="text-sm">Data might be incomplete or inaccurate.</span>
      </span>
    </TooltipTrigger>
    <TooltipContent
      side="bottom"
      align="start"
      className="max-w-sm p-4 text-sm leading-relaxed"
    >
      <div className="flex flex-col gap-3">
        <div>
          <p className="mb-1 font-semibold">Best-effort matching</p>
          <p className="text-muted-foreground">
            This trend is matched by course + professor. When a professor taught
            multiple sections of the same course in a term, the section with the
            closest schedule to the current class is shown. Section numbers may
            change across terms, and dates and times may shift between academic
            years, which can affect bid pricing.
          </p>
        </div>
        <div>
          <p className="mb-1 font-semibold">Missing data implies:</p>
          <ol className="text-muted-foreground list-decimal space-y-0.5 pl-4">
            <li>Class was not scraped</li>
            <li>Class was not offered in that academic term</li>
            <li>Class was preassigned (students placed without bidding)</li>
            <li>Class received no bids (zero demand or cancelled)</li>
          </ol>
        </div>
      </div>
    </TooltipContent>
  </Tooltip>
);
