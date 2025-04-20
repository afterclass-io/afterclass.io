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
import { reviewItemTheme } from "../ReviewItem.theme";

export const ReviewCreatedAt = ({ createdAt }: { createdAt: number }) => {
  const { timedelta } = reviewItemTheme({ size: { initial: "sm", md: "md" } });
  return (
    <Tooltip>
      <TooltipTrigger>
        <span className={timedelta()}>
          {getHumanReadableTimestampDelta(createdAt / 1000)}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <span>{getHumanReadableTimestampString(createdAt)}</span>
      </TooltipContent>
    </Tooltip>
  );
};
