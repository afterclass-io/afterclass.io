"use client";

import { CircleHelp } from "lucide-react";
import { Button } from "@/common/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import type { TourStep } from "./tour";
import { startTour } from "./tour";

/**
 * Icon button that replays a product tour on demand. Steps whose anchors
 * are hidden at click time are skipped; if nothing is visible the click
 * is a no-op.
 */
export function TourReplayButton({ steps }: { steps: TourStep[] }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Replay tour"
          onClick={() => void startTour(steps)}
        >
          <CircleHelp className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Replay tour</TooltipContent>
    </Tooltip>
  );
}
