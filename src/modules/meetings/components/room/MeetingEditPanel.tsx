"use client";

import { useId } from "react";
import { CalendarCheck, CalendarDays, Eraser, GraduationCap } from "lucide-react";

import { Button } from "@/common/components/button";
import { Checkbox } from "@/common/components/checkbox";
import { cn } from "@/common/functions";
import {
  MeetingAvailabilityBrush,
  type AvailabilityBrushMode,
} from "@/modules/meetings/components/grid/MeetingAvailabilityBrush";
import {
  OVERLAY_SOURCE_STYLES,
  type MeetingCalendarOverlay,
} from "@/modules/meetings/components/grid/MeetingCalendarOverlayLayer";

export type OverlaySource = MeetingCalendarOverlay["source"];

export type MeetingEditPanelProps = {
  brushMode: AvailabilityBrushMode;
  onBrushModeChange: (mode: AvailabilityBrushMode) => void;
  /** Which of the viewer's calendars are drawn on the grid. */
  visibleSources: Record<OverlaySource, boolean>;
  onVisibleSourceChange: (source: OverlaySource, visible: boolean) => void;
  hasTimetable: boolean;
  isTimetableLoading: boolean;
  isGoogleConnected: boolean;
  isGoogleSyncing: boolean;
  onConnectGoogle: () => void;
  onAutofillTimetable: () => void;
  onAutofillGoogle: () => void;
  onClear: () => void;
};

function CalendarRow({
  source,
  checked,
  disabled,
  note,
  onCheckedChange,
}: {
  source: OverlaySource;
  checked: boolean;
  disabled?: boolean;
  note?: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  const style = OVERLAY_SOURCE_STYLES[source];

  return (
    <div className="flex items-center gap-2 text-sm">
      <Checkbox
        id={id}
        checked={checked && !disabled}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(Boolean(value))}
        data-test={`meeting-calendar-${source}`}
      />
      <label
        htmlFor={id}
        className={cn(
          "flex min-w-0 flex-1 cursor-pointer items-center gap-2",
          disabled && "text-muted-foreground cursor-default",
        )}
      >
        <span className={cn("size-3.5 shrink-0 rounded-sm", style.swatch)} />
        <span className="truncate">{style.label}</span>
      </label>
      {note && <span className="text-muted-foreground text-xs">{note}</span>}
    </div>
  );
}

/**
 * Everything needed while editing availability, in a fixed-width sidebar so the
 * grid never reflows: brush legend, which calendars to show, autofill, clear.
 */
export function MeetingEditPanel({
  brushMode,
  onBrushModeChange,
  visibleSources,
  onVisibleSourceChange,
  hasTimetable,
  isTimetableLoading,
  isGoogleConnected,
  isGoogleSyncing,
  onConnectGoogle,
  onAutofillTimetable,
  onAutofillGoogle,
  onClear,
}: MeetingEditPanelProps) {
  return (
    <div className="space-y-4" data-test="meeting-edit-panel">
      <MeetingAvailabilityBrush
        activeMode={brushMode}
        onChange={onBrushModeChange}
      />

      <section className="space-y-2" data-test="meeting-calendars">
        <h2 className="text-sm font-semibold">My calendars</h2>
        <CalendarRow
          source="timetable"
          checked={visibleSources.timetable}
          disabled={!hasTimetable}
          note={isTimetableLoading ? "Loading" : hasTimetable ? undefined : "None found"}
          onCheckedChange={(visible) => onVisibleSourceChange("timetable", visible)}
        />
        {isGoogleConnected ? (
          <CalendarRow
            source="google"
            checked={visibleSources.google}
            onCheckedChange={(visible) => onVisibleSourceChange("google", visible)}
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onConnectGoogle}
            disabled={isGoogleSyncing}
            className="w-full justify-start gap-2"
          >
            <CalendarCheck className="size-4" />
            {isGoogleSyncing ? "Connecting..." : "Connect Google Calendar"}
          </Button>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Autofill</h2>
        <div className="grid gap-1.5" data-test="meeting-autofill">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAutofillTimetable}
            className="justify-start gap-2"
          >
            <GraduationCap className="size-4" />
            Free time from timetable
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAutofillGoogle}
            disabled={isGoogleSyncing}
            className="justify-start gap-2"
          >
            <CalendarDays className="size-4" />
            Free time from Google Calendar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-muted-foreground justify-start gap-2"
            data-test="meeting-clear-all-button"
          >
            <Eraser className="size-4" />
            Clear all
          </Button>
        </div>
      </section>
    </div>
  );
}
