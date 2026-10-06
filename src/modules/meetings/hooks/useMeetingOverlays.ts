"use client";

import { useMemo } from "react";

import type { MeetingCalendarOverlay } from "@/modules/meetings/components/grid/MeetingCalendarOverlayLayer";
import { useActiveTimetableOverlay } from "@/modules/meetings/hooks/useActiveTimetableOverlay";
import { useGoogleCalendarOverlay } from "@/modules/meetings/hooks/useGoogleCalendarOverlay";

export type UseMeetingOverlaysOptions = {
  startDate: Date;
  endDate: Date;
  startHour: number;
  endHour: number;
  slotMinutes: number;
  acadTermId?: string;
  enabled: boolean;
};

/**
 * The viewer's own commitments for a poll window: the active timetable plus
 * Google Calendar events, as one list of grid overlays alongside the blocked
 * slots each source contributes to autofill.
 */
export function useMeetingOverlays({
  startDate,
  endDate,
  startHour,
  endHour,
  slotMinutes,
  acadTermId,
  enabled,
}: UseMeetingOverlaysOptions) {
  const timetable = useActiveTimetableOverlay({
    startDate,
    endDate,
    startHour,
    endHour,
    slotMinutes,
    acadTermId,
    enabled,
  });
  const google = useGoogleCalendarOverlay({
    startDate,
    endDate,
    startHour,
    endHour,
    slotMinutes,
  });

  const overlays = useMemo<MeetingCalendarOverlay[]>(
    () => [
      ...timetable.overlayEvents.map((event, index) => ({
        id: `timetable-${index}`,
        title: event.title,
        source: "timetable" as const,
        slotIndices: event.slotIndices,
      })),
      ...google.googleEvents.map((event, index) => ({
        id: `google-${index}`,
        title: event.title,
        source: "google" as const,
        slotIndices: event.slotIndices,
      })),
    ],
    [timetable.overlayEvents, google.googleEvents],
  );

  return { overlays, timetable, google };
}
