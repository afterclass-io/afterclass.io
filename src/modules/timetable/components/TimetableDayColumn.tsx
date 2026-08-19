"use client";

import type { PositionedSlot } from "@/modules/timetable/functions/slot-math";
import {
  SMU_PERIODS,
  periodBandStyle,
} from "@/modules/timetable/functions/slot-math";
import { TimetableSlotCard } from "./TimetableSlotCard";
import type { BidInfo } from "./TimetableSlotCard";

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
 * Renders a day header, one subtle band per SMU class period, and positioned
 * slot cards layered on top (cards paint above the bands).
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

      {/* Grid area with period bands + slot cards */}
      <div className="relative flex-1">
        {/* One subtle band per SMU class period — teaching blocks visually
            separated from breaks. Cards paint above via the absolute slot
            layer below. */}
        <div className="pointer-events-none absolute inset-0">
          {SMU_PERIODS.map((p) => (
            <div
              key={p.label}
              className="bg-muted/30 border-border/50 absolute right-0 left-0 rounded-sm border"
              style={periodBandStyle(p)}
            />
          ))}
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
