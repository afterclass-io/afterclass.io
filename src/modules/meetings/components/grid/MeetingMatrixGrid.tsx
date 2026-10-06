"use client";

import { useMemo, useRef } from "react";

import { cn } from "@/common/functions";
import { formatDateSGT } from "@/common/functions/format-date-sgt";
import { CurrentTimeIndicator } from "@/modules/timetable/components/CurrentTimeIndicator";
import type { AvailabilityBrushMode } from "@/modules/meetings/components/grid/MeetingAvailabilityBrush";
import {
  MeetingCalendarOverlayLayer,
  type MeetingCalendarOverlay,
} from "@/modules/meetings/components/grid/MeetingCalendarOverlayLayer";
import { HeatmapHoverCard } from "@/modules/meetings/components/grid/HeatmapHoverCard";
import {
  MeetingHeatmapCell,
  type MeetingParticipantData,
} from "@/modules/meetings/components/grid/MeetingHeatmapCell";
import {
  SLOT_ROW_CLASS,
  SLOT_ROW_HEIGHT_PX,
} from "@/modules/meetings/components/grid/grid-layout";
import type { SlotRange } from "@/modules/meetings/functions/slot-runs";
import { useAvailabilityPainter } from "@/modules/meetings/hooks/useAvailabilityPainter";
import { useRangeSelection } from "@/modules/meetings/hooks/useRangeSelection";
import {
  buildSlotTally,
  getSlotTally,
} from "@/modules/meetings/functions/slot-tally";
import {
  calculateHeatmapRatio,
  generateDateRange,
  generateTimeSlots,
  getHeatmapBackgroundColor,
  normalizeDate,
} from "@/modules/meetings/utils/matrix";

export type MeetingMatrixGridProps = {
  startDate: string | Date;
  endDate: string | Date;
  startHour?: number; // default 8
  endHour?: number; // default 22
  slotMinutes?: number; // default 15

  viewMode?: "paint" | "heatmap";

  // Painter mode
  availableSlots?: number[];
  ifNeededSlots?: number[];
  onAvailabilityChange?: (slots: {
    availableSlots: number[];
    ifNeededSlots: number[];
  }) => void;
  brushMode?: AvailabilityBrushMode;
  /** The viewer's own calendar events, drawn behind painting (painter mode only). */
  overlays?: MeetingCalendarOverlay[];

  // Heatmap mode
  participants?: MeetingParticipantData[];
  hideIfNeeded?: boolean;
  /** Controlled time-range selection: click or drag inside one day column. */
  selectedRange?: SlotRange | null;
  onSelectRange?: (range: SlotRange | null) => void;

  readOnly?: boolean;
  className?: string;
};

const NO_SLOTS: number[] = [];
const NO_OVERLAYS: MeetingCalendarOverlay[] = [];
const NO_PARTICIPANTS: MeetingParticipantData[] = [];

function isSameDaySGT(d1: Date, d2: Date): boolean {
  return normalizeDate(d1).getTime() === normalizeDate(d2).getTime();
}

/**
 * Interactive 15-minute meeting matrix. In "paint" mode the viewer drags to mark
 * availability; in "heatmap" mode the group's availability is shown and a time
 * range can be selected.
 */
export function MeetingMatrixGrid({
  startDate,
  endDate,
  startHour = 8,
  endHour = 22,
  slotMinutes = 15,
  viewMode = "paint",
  availableSlots = NO_SLOTS,
  ifNeededSlots = NO_SLOTS,
  onAvailabilityChange,
  brushMode = "AVAILABLE",
  overlays = NO_OVERLAYS,
  participants = NO_PARTICIPANTS,
  hideIfNeeded = false,
  selectedRange = null,
  onSelectRange,
  readOnly = false,
  className,
}: MeetingMatrixGridProps) {
  const dates = useMemo(
    () => generateDateRange(startDate, endDate),
    [startDate, endDate],
  );
  const timeSlots = useMemo(
    () => generateTimeSlots(startHour, endHour, slotMinutes),
    [startHour, endHour, slotMinutes],
  );
  const slotsPerHour = Math.floor(60 / slotMinutes);
  const slotsPerDay = (endHour - startHour) * slotsPerHour;
  const today = useMemo(() => new Date(), []);

  const containerRef = useRef<HTMLDivElement>(null);
  const tally = useMemo(() => buildSlotTally(participants), [participants]);
  const describeSlot = (slot: number) => ({
    date: dates[Math.floor(slot / slotsPerDay)] ?? dates[0]!,
    timeStr: timeSlots[slot % slotsPerDay] ?? "",
  });

  const isPainting = viewMode === "paint" && !readOnly;
  const painter = useAvailabilityPainter({
    availableSlots,
    ifNeededSlots,
    brushMode,
    slotsPerDay,
    enabled: isPainting,
    onAvailabilityChange,
  });
  const selection = useRangeSelection({
    slotsPerDay,
    selectedRange,
    enabled: viewMode === "heatmap",
    onSelectRange,
  });
  const isDragging = painter.isDragging || selection.isDragging;
  const range = viewMode === "heatmap" ? selection.previewRange : null;

  return (
    <div
      ref={containerRef}
      data-test="meeting-matrix-grid"
      className={cn(
        "bg-background relative isolate overflow-x-auto rounded-xl border shadow-xs select-none",
        isPainting && "touch-none",
        className,
      )}
      style={{ touchAction: isPainting ? "none" : isDragging ? "none" : "pan-x pan-y" }}
      onTouchMove={isPainting ? painter.onTouchMove : selection.onTouchMove}
    >
      <div
        className="grid min-w-[560px]"
        style={{
          gridTemplateColumns: `56px repeat(${dates.length}, minmax(80px, 1fr))`,
        }}
      >
        <div className="bg-muted sticky left-0 z-30 flex h-12 items-center justify-center border-r border-b text-[11px] font-medium text-muted-foreground">
          SGT
        </div>

        {dates.map((date) => {
          const isToday = isSameDaySGT(date, today);
          return (
            <div
              key={date.toISOString()}
              className={cn(
                "bg-background flex h-12 flex-col items-center justify-center border-r border-b px-2 text-center",
                isToday && "bg-primary/5",
              )}
            >
              <span className="text-muted-foreground text-[11px] font-semibold uppercase">
                {formatDateSGT(date, { weekday: "short" })}
              </span>
              <span className="text-foreground text-xs font-bold">
                {formatDateSGT(date, { day: "numeric", month: "short" })}
              </span>
            </div>
          );
        })}

        <div className="bg-muted sticky left-0 z-10 border-r">
          {timeSlots.map((time) => {
            const isHour = time.endsWith(":00");
            return (
              <div
                key={time}
                className={cn(
                  SLOT_ROW_CLASS,
                  "text-muted-foreground flex items-start justify-end border-t pr-2 text-[10px]",
                  isHour ? "border-border font-medium" : "border-transparent text-transparent",
                )}
              >
                {isHour && <span>{time}</span>}
              </div>
            );
          })}
        </div>

        {dates.map((date, dayIdx) => {
          const dayStart = dayIdx * slotsPerDay;
          const dayRange =
            range && range.start >= dayStart && range.end < dayStart + slotsPerDay
              ? range
              : null;

          return (
            <div
              key={date.toISOString()}
              className={cn(
                "relative border-r last:border-r-0",
                isSameDaySGT(date, today) && "bg-primary/[0.02]",
              )}
            >
              {isSameDaySGT(date, today) && <CurrentTimeIndicator highlightNow />}

              {timeSlots.map((time, slotInDay) => {
                const slotIndex = dayStart + slotInDay;
                const rowBorder =
                  slotInDay % slotsPerHour === 0
                    ? "border-t-border"
                    : "border-t-border/25";

                if (viewMode === "heatmap") {
                  const { available, ifNeeded } = getSlotTally(tally, slotIndex);
                  const ratio = calculateHeatmapRatio(
                    available.length,
                    ifNeeded.length,
                    participants.length,
                    hideIfNeeded,
                  );
                  return (
                    <div
                      key={slotIndex}
                      className={cn(SLOT_ROW_CLASS, "border-t", rowBorder)}
                    >
                      <MeetingHeatmapCell
                        slotIndex={slotIndex}
                        backgroundColor={getHeatmapBackgroundColor(ratio)}
                        aria-label={`${formatDateSGT(date, { weekday: "short", day: "numeric", month: "short" })} ${time}`}
                        {...selection.slotHandlers(slotIndex)}
                      />
                    </div>
                  );
                }

                const isAvailable = painter.painted.available.has(slotIndex);
                const isIfNeeded = painter.painted.ifNeeded.has(slotIndex);
                return (
                  <div
                    key={slotIndex}
                    data-slot-index={slotIndex}
                    data-test={`matrix-slot-${slotIndex}`}
                    {...painter.slotHandlers(slotIndex)}
                    className={cn(
                      SLOT_ROW_CLASS,
                      "relative z-[1] border-t transition-colors",
                      rowBorder,
                      isPainting && "cursor-pointer touch-none",
                      isAvailable &&
                        "bg-[color-mix(in_srgb,var(--mt-available-soft)_75%,transparent)]",
                      isIfNeeded &&
                        "bg-[color-mix(in_srgb,var(--mt-if-needed)_80%,transparent)]",
                      !isAvailable && !isIfNeeded && isPainting && "hover:bg-muted/40",
                    )}
                  />
                );
              })}

              {viewMode === "paint" && (
                <MeetingCalendarOverlayLayer
                  overlays={overlays}
                  dayIndex={dayIdx}
                  slotsPerDay={slotsPerDay}
                />
              )}

              {dayRange && (
                <div
                  aria-hidden
                  data-test="meeting-range-selection"
                  className="border-primary bg-primary/10 pointer-events-none absolute inset-x-0 z-[2] rounded-sm border-2"
                  style={{
                    top: (dayRange.start - dayStart) * SLOT_ROW_HEIGHT_PX,
                    height: (dayRange.end - dayRange.start + 1) * SLOT_ROW_HEIGHT_PX,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      {viewMode === "heatmap" && (
        <HeatmapHoverCard
          containerRef={containerRef}
          participants={participants}
          tally={tally}
          hideIfNeeded={hideIfNeeded}
          describeSlot={describeSlot}
        />
      )}
    </div>
  );
}