"use client";

import { useMemo } from "react";
import { cn } from "@/common/functions";
import { layoutDay } from "@/modules/timetable/functions/slot-math";
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

const DAY_LABELS: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
};

/** Mon–Fri only: weekend slots (rare, e.g. some exams) are not rendered. */
const ALL_DAYS = [1, 2, 3, 4, 5] as const;

/** Time labels 08:00–22:00 in 30-min steps (28 labels). */
const TIME_LABELS = Array.from({ length: 28 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

function formatExamDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Singapore",
  });
}

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
            {/* Spacer header — must match day-header height exactly so
                the 28 flex-1 grid rows in this column stay in sync
                with the grid rows in every day column. */}
            <div
              className="bg-muted/50 border-border shrink-0 border-b px-2 py-1.5 text-xs font-semibold invisible"
              aria-hidden
            >
              Mon
            </div>

            {/* Time labels in the grid area */}
            <div className="relative flex-1">
              {/* Background grid lines (same as day columns, invisible here) */}
              <div className="pointer-events-none absolute inset-0 flex flex-col">
                {TIME_LABELS.map((_, idx) => {
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

              {/* Labels positioned at each hour row via flex */}
              <div className="absolute inset-0 flex flex-col">
                {TIME_LABELS.map((label, idx) => {
                  const isHour = idx % 2 === 0;
                  return (
                    <div
                      key={idx}
                      className="flex flex-1 items-start justify-end"
                    >
                      {isHour && (
                        <span className="text-muted-foreground -mt-2 pr-1.5 text-[10px] leading-none select-none">
                          {label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Day columns */}
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
      });
    }
  }

  // Run layoutDay on each day's timings
  for (const dayNum of ALL_DAYS) {
    const raw = days[dayNum] ?? [];
    if (raw.length === 0) continue;

    const positioned = layoutDay(raw.map((s) => s.timing));
    days[dayNum] = raw.map((slot, idx) => {
      const pos = positioned[idx]!;
      return {
        ...slot,
        topPct: pos.topPct,
        heightPct: pos.heightPct,
        colIndex: pos.colIndex,
        colCount: pos.colCount,
      };
    });
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

      const dateBadge = formatExamDate(timing.date);
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
      });
    }
  }

  // Run layoutDay on each day's exam timings
  for (const dayNum of ALL_DAYS) {
    const raw = days[dayNum] ?? [];
    if (raw.length === 0) continue;

    const positioned = layoutDay(raw.map((s) => s.timing));
    days[dayNum] = raw.map((slot, idx) => {
      const pos = positioned[idx]!;
      return {
        ...slot,
        topPct: pos.topPct,
        heightPct: pos.heightPct,
        colIndex: pos.colIndex,
        colCount: pos.colCount,
      };
    });
  }

  return days;
}

function dayOfWeekToNumber(day: string | undefined | null): number | null {
  if (!day) return null;
  const u = day.toUpperCase();
  const map: Record<string, number> = {
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    THUR: 4,
    FRI: 5,
    SAT: 6,
  };
  return map[u] ?? null;
}
