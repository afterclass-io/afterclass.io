"use client";

import { cn } from "@/common/functions";
import type { PositionedSlot } from "@/modules/timetable/functions/slot-math";
import { TimetableSlotCard } from "./TimetableSlotCard";
import type { BidInfo } from "./TimetableSlotCard";

// 08:00–22:00 in 30-min increments = 28 half-hour rows
const HALF_HOUR_SLOTS = 28;

/** A class slot enriched with its course metadata. */
export type DaySlot = PositionedSlot & {
  classId: string;
  courseCode: string;
  courseName: string;
  section: string;
  professorName?: string | null;
  venue?: string | null;
  /** Whether this slot represents an exam rather than a class. */
  isExam?: boolean;
};

export type TimetableDayColumnProps = {
  dayLabel: string;
  slots: DaySlot[];
  highlightNow?: boolean;
  readOnly?: boolean;
  onSlotClick?: (classId: string) => void;
  /** Called when a slot's remove affordance is clicked (owner view only). */
  onSlotRemove?: (classId: string) => void;
  /** Disable remove affordances while a removal is in flight. */
  removeDisabled?: boolean;
  /** Map of classId → latest bid info for chip display. */
  bids?: Record<string, BidInfo>;
};

/**
 * A single day column in the vertical timetable grid.
 *
 * Renders a day header, evenly-spaced grid lines (hourly solid, half-hour
 * dashed), and positioned slot cards layered on top.
 */
export function TimetableDayColumn({
  dayLabel,
  slots,
  highlightNow = false,
  readOnly = false,
  onSlotClick,
  onSlotRemove,
  removeDisabled = false,
  bids,
}: TimetableDayColumnProps) {
  return (
    <div className="border-border relative flex flex-1 flex-col border-r last:border-r-0">
      {/* Day header */}
      <div className="bg-muted/50 border-border text-muted-foreground shrink-0 border-b px-2 py-1.5 text-center text-xs font-semibold tracking-wide uppercase">
        {dayLabel}
      </div>

      {/* Grid area with background lines + slot cards */}
      <div className="relative flex-1">
        {/* Grid background: 28 evenly-spaced rows */}
        <div className="pointer-events-none absolute inset-0 flex flex-col">
          {Array.from({ length: HALF_HOUR_SLOTS }).map((_, idx) => {
            // idx 0   = 08:00   (no border-top, first row)
            // idx 2   = 08:30   (dashed)
            // idx 2   = 09:00   (solid)
            const isHour = idx % 2 === 0;
            return (
              <div
                key={idx}
                className={cn(
                  "flex-1 border-t",
                  isHour
                    ? "border-border/50"
                    : "border-border/20 border-dashed",
                  idx === 0 && "border-t-0",
                )}
              />
            );
          })}
        </div>

        {/* Slot cards positioned within the grid */}
        <div className="absolute inset-0">
          {slots.map((daySlot) => (
            <TimetableSlotCard
              key={`${daySlot.classId}-${daySlot.timing.dayOfWeek ?? "?"}-${daySlot.timing.startTime}`}
              courseCode={daySlot.courseCode}
              courseName={daySlot.courseName}
              section={daySlot.section}
              professorName={daySlot.professorName}
              venue={daySlot.venue ?? daySlot.timing.venue ?? null}
              slot={daySlot}
              highlightNow={highlightNow}
              readOnly={readOnly}
              onClick={() => onSlotClick?.(daySlot.classId)}
              onRemove={
                onSlotRemove ? () => onSlotRemove(daySlot.classId) : undefined
              }
              removeDisabled={removeDisabled}
              bidInfo={bids?.[daySlot.classId]}
              isExam={daySlot.isExam}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
