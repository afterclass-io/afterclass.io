"use client";

import { useMemo } from "react";
import { dayOfWeekToNumber, DAY_LABELS } from "@/common/functions/day-of-week";
import { formatDateSGT } from "@/common/functions/format-date-sgt";
import {
  layoutDay,
  SMU_PERIODS,
  periodBandStyle,
} from "@/modules/timetable/functions/slot-math";
import type { ClassTimingLike } from "@/modules/timetable/functions/slot-math";
import { TimetableDayColumn } from "./TimetableDayColumn";
import type { DaySlot } from "./TimetableDayColumn";
import type { BidInfo } from "./TimetableSlotCard";
import { CurrentTimeIndicator } from "./CurrentTimeIndicator";
import { TimetableAgenda } from "./TimetableAgenda";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ArrangedClass = {
  classId: string;
  courseCode: string;
  courseName: string;
  section: string;
  professorName?: string | null;
  creditUnits: number;
  timings: ClassTimingLike[];
  examTimings: ClassExamTiming[];
};

export type ClassExamTiming = {
  date: Date | string;
  dayOfWeek?: string | null;
  startTime: string;
  endTime: string;
  venue?: string | null;
};

export type TimetableGridProps = {
  classes: ArrangedClass[];
  /** Which mode the grid is in. */
  view?: "classes" | "exams";
  /** Show the current-time indicator line. */
  highlightNow?: boolean;
  /** Disable slot interaction. */
  readOnly?: boolean;
  /** Called when a slot card is clicked. */
  onSlotClick?: (classId: string) => void;
  /** Called when a slot's remove affordance is clicked. */
  onSlotRemove?: (classId: string) => void;
  /** Disable remove affordances while a removal is in flight. */
  removeDisabled?: boolean;
  /** Map of classId → latest bid info for chip display on slot cards. */
  bids?: Record<string, BidInfo>;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Mon–Fri only: weekend slots (rare, e.g. some exams) are not rendered. */
const ALL_DAYS = [1, 2, 3, 4, 5] as const;
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Main vertical timetable grid.
 *
 * Groups class (or exam) timings by day of week, runs `layoutDay` on each
 * day's slots, and renders 6 `TimetableDayColumn` instances plus an optional
 * `CurrentTimeIndicator`.
 *
 * Below the `lg` breakpoint a `TimetableAgenda` (vertical day list) is
 * rendered instead of the grid — the standard mobile calendar pattern.
 */
export function TimetableGrid({
  classes,
  view = "classes",
  highlightNow = false,
  readOnly = false,
  onSlotClick,
  onSlotRemove,
  removeDisabled = false,
  bids,
}: TimetableGridProps) {
  const days = useMemo(() => {
    if (view === "exams") {
      return buildExamDays(classes);
    }
    return buildClassDays(classes);
  }, [classes, view]);

  const hasUnscheduled = useMemo(() => {
    if (view === "exams") return false;
    return classes.some((c) => c.timings.length === 0);
  }, [classes, view]);

  return (
    <div className="flex flex-col gap-4">
      {/* Agenda layout on phones/tablets (no horizontal scrolling) */}
      <div className="lg:hidden">
        <TimetableAgenda
          days={days}
          dayLabels={DAY_LABELS}
          readOnly={readOnly}
          onSlotClick={onSlotClick}
          onSlotRemove={onSlotRemove}
          removeDisabled={removeDisabled}
          bids={bids}
        />
      </div>

      {/* Grid: explicit height so %-positioned slots resolve; horizontal
          scroll with a min column width on small screens (desktop only).
          `isolate` confines inner z-indexes (sticky time axis, now-line)
          to this stacking context so they can't paint over the sticky
          page header when scrolling. `[contain:inline-size]` keeps the
          inner min-width from leaking up through flex ancestors and
          forcing page-level horizontal overflow when the sidebar is
          docked (≥xl); the wrapper still scrolls internally. */}
      <div
        data-test="timetable-grid"
        className="border-border bg-card hidden isolate overflow-x-auto rounded-lg border [contain:inline-size] lg:block"
      >
        <div className="relative flex h-[70vh] max-h-[720px] min-h-[480px] min-w-[680px]">
          {/* Time axis column (stays visible while scrolling horizontally) */}
          <div className="border-border bg-card sticky left-0 z-10 flex w-14 shrink-0 flex-col border-r">
            {/* Spacer header — must match day-header height exactly so the
                axis labels in this column stay in sync with the period bands
                and slot cards in every day column. */}
            <div
              className="bg-muted/50 border-border shrink-0 border-b px-2 py-1.5 text-xs font-semibold invisible"
              aria-hidden
            >
              Mon
            </div>

            {/* One label per SMU class period, absolutely positioned against
                the same relative grid area the day columns use. */}
            <div className="relative flex-1">
              {SMU_PERIODS.map((p) => (
                <div
                  key={p.label}
                  className="absolute right-1 left-1"
                  style={{ top: periodBandStyle(p).top }}
                >
                  <span className="text-muted-foreground text-sm font-medium select-none">
                    {p.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Day columns — px-1 gives outer cards room for hover shadows and
              focus/now rings that paint outside their border box: Monday's left
              edge against the sticky axis column, Friday's right edge against
              the scrollport. */}
          <div className="flex min-w-0 flex-1 px-1">
            {ALL_DAYS.map((dayIdx) => (
              <TimetableDayColumn
                key={dayIdx}
                dayLabel={DAY_LABELS[dayIdx] ?? String(dayIdx)}
                slots={days[dayIdx] ?? []}
                highlightNow={highlightNow}
                readOnly={readOnly}
                onSlotClick={onSlotClick}
                onSlotRemove={onSlotRemove}
                removeDisabled={removeDisabled}
                bids={bids}
              />
            ))}
          </div>

          {/* Current-time indicator overlays the grid */}
          <CurrentTimeIndicator highlightNow={highlightNow} />
        </div>
      </div>

      {/* Unscheduled tray */}
      {view === "classes" && hasUnscheduled && (
        <div className="border-border bg-card rounded-lg border p-3">
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
            Unscheduled
          </p>
          <div className="flex flex-wrap gap-2">
            {classes
              .filter((c) => c.timings.length === 0)
              .map((c) => (
                <span
                  key={c.classId}
                  className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs"
                >
                  {c.courseCode} {c.section}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildClassDays(classes: ArrangedClass[]): Record<number, DaySlot[]> {
  const days: Record<number, DaySlot[]> = {};

  for (const cls of classes) {
    for (const timing of cls.timings) {
      const dayNum = dayOfWeekToNumber(timing.dayOfWeek);
      if (dayNum === null) continue;

      days[dayNum] ??= [];

      days[dayNum].push({
        classId: cls.classId,
        courseCode: cls.courseCode,
        courseName: cls.courseName,
        section: cls.section,
        professorName: cls.professorName,
        venue: timing.venue ?? null,
        // These fields will be overwritten by layoutDay
        timing,
        topPct: 0,
        heightPct: 0,
        colIndex: 0,
        colCount: 1,
        rawIndex: 0,
      });
    }
  }

  // Run layoutDay on each day's timings
  for (const dayNum of ALL_DAYS) {
    const raw = days[dayNum] ?? [];
    if (raw.length === 0) continue;

    const positioned = layoutDay(raw.map((s) => s.timing));
    const positionedByRawIndex = new Map(
      positioned.map((p) => [p.rawIndex, p]),
    );
    days[dayNum] = raw
      .map((slot, idx) => {
        const pos = positionedByRawIndex.get(idx);
        if (!pos) {
          // Slot was filtered out (fully outside the visible grid) — skip it.
          return null;
        }
        return {
          ...slot,
          topPct: pos.topPct,
          heightPct: pos.heightPct,
          colIndex: pos.colIndex,
          colCount: pos.colCount,
        };
      })
      .filter((s): s is DaySlot => s !== null);
  }

  return days;
}

function buildExamDays(classes: ArrangedClass[]): Record<number, DaySlot[]> {
  const days: Record<number, DaySlot[]> = {};

  for (const cls of classes) {
    for (const timing of cls.examTimings) {
      const dayNum = dayOfWeekToNumber(timing.dayOfWeek);
      if (dayNum === null) continue;

      days[dayNum] ??= [];

      const dateBadge = formatDateSGT(timing.date, {
        day: "numeric",
        month: "short",
      });
      days[dayNum].push({
        classId: cls.classId,
        courseCode: cls.courseCode,
        courseName: cls.courseName,
        section: cls.section,
        professorName: cls.professorName,
        venue: timing.venue ? `${timing.venue} — ${dateBadge}` : dateBadge,
        isExam: true,
        timing: {
          dayOfWeek: timing.dayOfWeek,
          startTime: timing.startTime,
          endTime: timing.endTime,
          venue: timing.venue,
        },
        topPct: 0,
        heightPct: 0,
        colIndex: 0,
        colCount: 1,
        rawIndex: 0,
      });
    }
  }

  // Run layoutDay on each day's exam timings
  for (const dayNum of ALL_DAYS) {
    const raw = days[dayNum] ?? [];
    if (raw.length === 0) continue;

    const positioned = layoutDay(raw.map((s) => s.timing));
    const positionedByRawIndex = new Map(
      positioned.map((p) => [p.rawIndex, p]),
    );
    days[dayNum] = raw
      .map((slot, idx) => {
        const pos = positionedByRawIndex.get(idx);
        if (!pos) {
          // Slot was filtered out (fully outside the visible grid) — skip it.
          return null;
        }
        return {
          ...slot,
          topPct: pos.topPct,
          heightPct: pos.heightPct,
          colIndex: pos.colIndex,
          colCount: pos.colCount,
        };
      })
      .filter((s): s is DaySlot => s !== null);
  }

  return days;
}
