"use client";

import { X } from "lucide-react";
import { cn } from "@/common/functions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/common/components/tooltip";
import { courseColor } from "@/modules/timetable/functions/course-color";
import { abbreviateVenue } from "@/modules/timetable/functions/abbreviate-venue";
import { formatBidAmount } from "@/modules/timetable/functions/format";
import { bidChipVariant, slotCardVariant } from "@/modules/timetable/functions/bid-status";
import type { UserBidStatus } from "@/modules/timetable/functions/bid-status";
import type { BidInfo } from "./TimetableSlotCard";
import type { DaySlot } from "./TimetableDayColumn";

export type TimetableAgendaProps = {
  /** Day-of-week number → that day's slots (same shape as the grid). */
  days: Record<number, DaySlot[]>;
  /** Day-of-week number → short label ("Mon", …). */
  dayLabels: Record<number, string>;
  /** Disable slot interaction. */
  readOnly?: boolean;
  /** Called when a slot card is clicked. */
  onSlotClick?: (classId: string) => void;
  /** Called when a slot's remove affordance is clicked (owner view only). */
  onSlotRemove?: (classId: string) => void;
  /** Disable remove affordances while a removal is in flight. */
  removeDisabled?: boolean;
  /** Map of classId → latest bid info for chip display. */
  bids?: Record<string, BidInfo>;
};

/**
 * Mobile ("agenda") layout for the timetable: a vertical list of days, each
 * with compact cards for that day's classes, sorted by start time. Rendered
 * below the `lg` breakpoint in place of the grid — no horizontal scrolling.
 */
export function TimetableAgenda({
  days,
  dayLabels,
  readOnly = false,
  onSlotClick,
  onSlotRemove,
  removeDisabled = false,
  bids,
}: TimetableAgendaProps) {
  const dayNumbers = Object.keys(days)
    .map(Number)
    .filter((d) => (days[d]?.length ?? 0) > 0)
    .toSorted((a, b) => a - b);

  return (
    <div className="flex flex-col gap-3" data-test="timetable-agenda">
      {dayNumbers.map((dayNum) => {
        const slots = [...(days[dayNum] ?? [])].toSorted((a, b) =>
          a.timing.startTime.localeCompare(b.timing.startTime),
        );
        return (
          <div key={dayNum} className="border-border bg-card overflow-hidden rounded-lg border">
            <div className="bg-muted/50 border-border text-muted-foreground border-b px-3 py-1.5 text-xs font-semibold tracking-wide uppercase">
              {dayLabels[dayNum] ?? String(dayNum)}
            </div>
            <div className="divide-border flex flex-col divide-y">
              {slots.map((slot) => (
                <AgendaRow
                  key={`${slot.classId}-${slot.timing.startTime}`}
                  slot={slot}
                  readOnly={readOnly}
                  onSlotClick={onSlotClick}
                  onSlotRemove={onSlotRemove}
                  removeDisabled={removeDisabled}
                  bidInfo={bids?.[slot.classId]}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgendaRow({
  slot,
  readOnly,
  onSlotClick,
  onSlotRemove,
  removeDisabled,
  bidInfo,
}: {
  slot: DaySlot;
  readOnly: boolean;
  onSlotClick?: (classId: string) => void;
  onSlotRemove?: (classId: string) => void;
  removeDisabled: boolean;
  bidInfo?: BidInfo;
}) {
  const { className: colorClasses } = courseColor(slot.courseCode);
  const bidStatus = bidInfo?.status as UserBidStatus | undefined;
  const cardVariant = slotCardVariant(bidStatus);
  const cardClasses = bidInfo ? (cardVariant ?? colorClasses) : colorClasses;
  const rawVenue = slot.venue ?? slot.timing.venue ?? null;
  const venue = rawVenue ? abbreviateVenue(rawVenue) : null;

  return (
    <div className="group relative flex items-center gap-2 px-2 py-1.5">
      {/* Time column */}
      <div className="text-muted-foreground w-20 shrink-0 font-mono text-[11px] leading-tight tabular-nums">
        <span className="block">{slot.timing.startTime}</span>
        <span className="block">{slot.timing.endTime}</span>
      </div>

      {/* Class card */}
      <button
        type="button"
        disabled={readOnly}
        onClick={readOnly ? undefined : () => onSlotClick?.(slot.classId)}
        className={cn(
          "min-w-0 flex-1 rounded-md border px-2 py-1.5 text-left text-xs leading-tight",
          cardClasses,
          slot.isExam && "border-dashed",
          readOnly
            ? "cursor-default"
            : "focus-visible:ring-ring cursor-pointer focus-visible:ring-1",
        )}
      >
        <span className="block truncate font-semibold">
          {slot.courseCode}
          <span className="ml-1 font-normal opacity-75">{slot.section}</span>
          {slot.isExam && <span className="ml-1 font-normal opacity-75">· Exam</span>}
        </span>
        {(venue ?? slot.professorName) && (
          <span className="block truncate opacity-75">
            {[venue, slot.professorName].filter(Boolean).join(" · ")}
          </span>
        )}
        {bidInfo && !readOnly && (
          <span
            className={cn(
              "mt-0.5 inline-block rounded-sm px-1 py-px text-[10px] leading-none font-medium",
              bidChipVariant(bidInfo.status as UserBidStatus),
            )}
          >
            {formatBidAmount(bidInfo.amount)} · R{bidInfo.round}
          </span>
        )}
      </button>

      {onSlotRemove && !readOnly && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`Remove ${slot.courseCode} ${slot.section} from timetable`}
              disabled={removeDisabled}
              onClick={() => {
                if (removeDisabled) return;
                onSlotRemove(slot.classId);
              }}
              className="bg-background/80 text-muted-foreground hover:bg-destructive/15 hover:text-destructive flex size-6 shrink-0 items-center justify-center rounded-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Remove from timetable</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
