"use client";
import {
  getHumanReadableTimestampDelta,
  getHumanReadableTimestampString,
} from "@/common/functions";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/common/components/tooltip";

export const ReviewCreatedAt = ({ createdAt }: { createdAt: number }) => {
  return (
    <Tooltip>
      <TooltipTrigger>
        <span className="overflow-hidden text-ellipsis md:text-sm">
          {getHumanReadableTimestampDelta(createdAt / 1000)}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <span>{getHumanReadableTimestampString(createdAt)}</span>
      </TooltipContent>
    </Tooltip>
  );
};
