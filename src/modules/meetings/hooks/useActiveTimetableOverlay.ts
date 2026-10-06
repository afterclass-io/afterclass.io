"use client";

import { useCallback, useMemo } from "react";
import { api } from "@/common/tools/trpc/react";
import { normalizeDayOfWeek } from "@/common/functions/day-of-week";
import { timeToMinutes } from "@/common/functions/time";
import { generateDateRange } from "@/modules/meetings/utils/matrix";

export interface TimetableSlotLike {
  classId?: string;
  courseId?: string;
  courseCode?: string;
  courseName?: string;
  section?: string | null;
  day?: string | null;
  dayOfWeek?: string | null;
  startTime: string;
  endTime: string;
  venue?: string | null;
}

export interface TimetableOverlayEvent {
  title: string;
  courseCode?: string;
  section?: string | null;
  slotIndices: number[];
}

export interface MapTimetableSlotsOptions {
  slots: readonly TimetableSlotLike[];
  startDate: string | Date;
  endDate: string | Date;
  startHour?: number; // default 8
  endHour?: number; // default 22
  slotMinutes?: number; // default 15
}

/**
 * Pure algorithm: maps enrolled timetable class slots to linear slot indices
 * across concrete calendar dates in a meeting poll interval.
 */
export function mapTimetableSlotsToOverlay({
  slots,
  startDate,
  endDate,
  startHour = 8,
  endHour = 22,
  slotMinutes = 15,
}: MapTimetableSlotsOptions): {
  blockedSlots: Set<number>;
  overlayEvents: TimetableOverlayEvent[];
} {
  const dates = generateDateRange(startDate, endDate);
  const slotsPerHour = Math.floor(60 / slotMinutes);
  const slotsPerDay = (endHour - startHour) * slotsPerHour;

  const blockedSlots = new Set<number>();
  const overlayEvents: TimetableOverlayEvent[] = [];

  if (dates.length === 0 || slotsPerDay <= 0) {
    return { blockedSlots, overlayEvents };
  }

  const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

  dates.forEach((date, dayIdx) => {
    const dayOfWeekName = DAY_NAMES[date.getDay()];

    for (const slot of slots) {
      const rawDay = slot.dayOfWeek ?? slot.day;
      const normalizedDay = normalizeDayOfWeek(rawDay);
      if (!normalizedDay || normalizedDay !== dayOfWeekName) {
        continue;
      }

      let classStartMin: number;
      let classEndMin: number;
      try {
        classStartMin = timeToMinutes(slot.startTime);
        classEndMin = timeToMinutes(slot.endTime);
      } catch {
        continue;
      }

      const eventSlotIndices: number[] = [];

      for (let s = 0; s < slotsPerDay; s++) {
        const slotStartMin = startHour * 60 + s * slotMinutes;
        const slotEndMin = slotStartMin + slotMinutes;

        // Overlap: [slotStartMin, slotEndMin) overlaps [classStartMin, classEndMin)
        if (slotStartMin < classEndMin && classStartMin < slotEndMin) {
          const slotIndex = dayIdx * slotsPerDay + s;
          blockedSlots.add(slotIndex);
          eventSlotIndices.push(slotIndex);
        }
      }

      if (eventSlotIndices.length > 0) {
        const title = slot.courseCode
          ? slot.section
            ? `${slot.courseCode} ${slot.section}`
            : slot.courseCode
          : "Class";

        overlayEvents.push({
          title,
          courseCode: slot.courseCode,
          section: slot.section,
          slotIndices: eventSlotIndices,
        });
      }
    }
  });

  return { blockedSlots, overlayEvents };
}

/**
 * Pure 1-click autofill calculation: returns all grid slot indices (0..totalSlots - 1)
 * that are NOT in timetableBlockedSlots and NOT in googleBlockedSlots.
 */
export function computeFreeSlots(
  totalSlots: number,
  timetableBlockedSlots?: Set<number> | Iterable<number> | null,
  googleBlockedSlots?: Set<number> | Iterable<number> | null,
): number[] {
  const tSet =
    timetableBlockedSlots instanceof Set
      ? timetableBlockedSlots
      : new Set(timetableBlockedSlots ?? []);
  const gSet =
    googleBlockedSlots instanceof Set
      ? googleBlockedSlots
      : new Set(googleBlockedSlots ?? []);

  const free: number[] = [];
  for (let i = 0; i < totalSlots; i++) {
    if (!tSet.has(i) && !gSet.has(i)) {
      free.push(i);
    }
  }
  return free;
}

export interface UseActiveTimetableOverlayOptions {
  startDate: string | Date;
  endDate: string | Date;
  startHour?: number;
  endHour?: number;
  slotMinutes?: number;
  acadTermId?: string | null;
  enabled?: boolean;
}

export interface UseActiveTimetableOverlayReturn {
  isLoading: boolean;
  error: unknown;
  /** True once a timetable was found for the requested term. */
  hasTimetable: boolean;
  blockedSlots: Set<number>;
  overlayEvents: TimetableOverlayEvent[];
  timetableId?: string;
  timetableName?: string;
  refetch: () => void;
}

/**
 * Hook to fetch the student's active timetable and convert class times into blocked
 * 15-minute slot indices and overlay events for a meeting poll window.
 */
export function useActiveTimetableOverlay({
  startDate,
  endDate,
  startHour = 8,
  endHour = 22,
  slotMinutes = 15,
  acadTermId,
  enabled = true,
}: UseActiveTimetableOverlayOptions): UseActiveTimetableOverlayReturn {
  const { data, isLoading, error, refetch } =
    api.timetable.getMyTimetableDetail.useQuery(
      { acadTermId: acadTermId ?? undefined },
      {
        enabled: enabled && acadTermId !== null,
        staleTime: 60_000,
      },
    );

  const slots = data?.slots;
  const { blockedSlots, overlayEvents } = useMemo(() => {
    if (!slots || slots.length === 0) {
      return { blockedSlots: new Set<number>(), overlayEvents: [] };
    }

    return mapTimetableSlotsToOverlay({
      slots,
      startDate,
      endDate,
      startHour,
      endHour,
      slotMinutes,
    });
  }, [slots, startDate, endDate, startHour, endHour, slotMinutes]);

  const handleRefetch = useCallback(() => {
    void refetch();
  }, [refetch]);

  return {
    isLoading,
    error,
    hasTimetable: Boolean(data),
    blockedSlots,
    overlayEvents,
    timetableId: data?.timetableId,
    timetableName: data?.name,
    refetch: handleRefetch,
  };
}
