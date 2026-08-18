"use client";

import { X } from "lucide-react";
import { cn } from "@/common/functions";
import { Tag } from "@/common/components/tag";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import { courseColor } from "@/modules/timetable/functions/course-color";
import { formatBidAmount } from "@/modules/timetable/functions/format";
import {
  bidChipVariant,
  slotCardVariant,
  type UserBidStatus,
} from "@/modules/timetable/functions/bid-status";
import type { PositionedSlot } from "@/modules/timetable/functions/slot-math";

export type BidInfo = {
  amount: number;
  round: string;
  status: string;
};

export type TimetableSlotCardProps = {
  courseCode: string;
  courseName: string;
  section: string;
  professorName?: string | null;
  venue?: string | null;
  /** The positioned slot from layoutDay. */
  slot: PositionedSlot;
  /** Whether this slot is currently in session. */
  highlightNow?: boolean;
  /** When true, hover effects and click handlers are disabled. */
  readOnly?: boolean;
  /** Called when the card is clicked (unless readOnly). */
  onClick?: () => void;
  /** Called when the remove (×) affordance is clicked (owner view only). */
  onRemove?: () => void;
  /** Disable the remove (×) affordance while a removal is in flight. */
  removeDisabled?: boolean;
  /** Optional bid info to display as a compact chip (owner view only). */
  bidInfo?: BidInfo;
  /** Whether this slot is an exam (adds dashed border + EXAM tag). */
  isExam?: boolean;
};

/**
 * A single class slot rendered inside a day column.
 *
 * Positioned absolutely via top / height / left derived from the
 * PositionedSlot percentages. A subtle remove (×) button appears in the
 * top-right corner on hover/focus when `onRemove` is provided.
 */
export function TimetableSlotCard({
  courseCode,
  courseName,
  section,
  professorName: _professorName,
  venue,
  slot,
  highlightNow = false,
  readOnly = false,
  onClick,
  onRemove,
  removeDisabled = false,
  bidInfo,
  isExam = false,
}: TimetableSlotCardProps) {
  const { className: colorClasses } = courseColor(courseCode);
  const { topPct, heightPct, colIndex, colCount } = slot;

  const bidStatus = bidInfo?.status as UserBidStatus | undefined;
  const cardVariant = slotCardVariant(bidStatus);
  const cardClasses = bidInfo ? (cardVariant ?? colorClasses) : colorClasses;
  const isSecured = bidStatus === "SECURED";

  // An extra gap between columns so cards don't touch
  const gapPct = colCount > 1 ? 0.5 : 0;
  const leftPct = colCount > 1 ? (colIndex / colCount) * 100 + gapPct : 0;
  const widthPct = colCount > 1 ? (1 / colCount) * 100 - gapPct * 2 : 100;

  const showChip = bidInfo && !readOnly;
  const showRemove = !!onRemove && !readOnly;

  return (
    <div
      className="group absolute"
      data-test="timetable-slot-card"
      style={{
        top: `${topPct}%`,
        height: `${heightPct}%`,
        left: `${leftPct}%`,
        width: `${widthPct}%`,
      }}
    >
      <button
        type="button"
        disabled={readOnly}
        onClick={readOnly ? undefined : onClick}
        data-test={isSecured ? "timetable-slot-card-secured" : undefined}
        className={cn(
          "block h-full w-full overflow-hidden rounded-md border px-1.5 py-0.5 text-left text-xs leading-tight transition-shadow",
          cardClasses,
          isExam && "border-dashed",
          readOnly
            ? "cursor-default"
            : "focus-visible:ring-ring cursor-pointer hover:z-10 hover:shadow-md focus-visible:ring-1",
          highlightNow && "ring-primary z-20 ring-2 ring-offset-1",
        )}
      >
        <span className="block truncate font-semibold">
          {courseCode}
          <span className="ml-1 font-normal opacity-75">{section}</span>
        </span>
        <span className="block truncate text-[10px] opacity-75">
          {courseName}
        </span>
        {isExam && (
          <Tag
            variant="soft"
            color="error"
            size="xs"
            deletable={false}
            className="mt-0.5"
          >
            EXAM
          </Tag>
        )}
        {venue && <span className="block truncate opacity-75">{venue}</span>}
        {showChip && (
          <span
            className={cn(
              "mt-0.5 inline-block rounded-sm px-1 py-px text-[10px] leading-none font-medium",
              bidChipVariant(bidInfo.status as UserBidStatus),
            )}
          >
            {formatBidAmount(bidInfo.amount)}{" "}
            · R{bidInfo.round}
          </span>
        )}
      </button>

      {showRemove && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`Remove ${courseCode} ${section} from timetable`}
              data-test={`timetable-slot-remove-${courseCode}-${section}`}
              disabled={removeDisabled}
              onClick={(e) => {
                e.stopPropagation();
                if (removeDisabled) return;
                onRemove();
              }}
              className={cn(
                "bg-background/80 text-muted-foreground absolute top-0.5 right-0.5 z-20 flex size-4 items-center justify-center rounded-sm",
                "hover:bg-destructive/15 hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <X className="size-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Remove from timetable</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
