"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { generateDateRange } from "@/modules/meetings/utils/matrix";

export interface GoogleCalendarEventItem {
  id?: string;
  summary?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
}

export interface GoogleOverlayEvent {
  title: string;
  slotIndices: number[];
}

export interface MapGoogleEventsOptions {
  events: readonly GoogleCalendarEventItem[];
  startDate: string | Date;
  endDate: string | Date;
  startHour?: number; // default 8
  endHour?: number; // default 22
  slotMinutes?: number; // default 15
}

function toIsoDateString(d: Date | string): string {
  if (typeof d === "string") {
    return d.slice(0, 10);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Pure algorithm: maps Google Calendar event items to linear slot indices
 * across concrete calendar dates in a meeting poll interval.
 * Uses Singapore Time (UTC+8, no DST) as the canonical application timezone.
 */
export function mapGoogleEventsToSlots({
  events,
  startDate,
  endDate,
  startHour = 8,
  endHour = 22,
  slotMinutes = 15,
}: MapGoogleEventsOptions): {
  blockedSlots: Set<number>;
  overlayEvents: GoogleOverlayEvent[];
} {
  const dates = generateDateRange(startDate, endDate);
  const slotsPerHour = Math.floor(60 / slotMinutes);
  const slotsPerDay = (endHour - startHour) * slotsPerHour;
  const slotMs = slotMinutes * 60 * 1000;
  const dayStartOffsets = dates.map((date) => {
    const isoDay = toIsoDateString(date);
    return Date.parse(`${isoDay}T${String(startHour).padStart(2, "0")}:00:00+08:00`);
  });

  const blockedSlots = new Set<number>();
  const overlayEvents: GoogleOverlayEvent[] = [];

  if (dates.length === 0 || slotsPerDay <= 0 || events.length === 0) {
    return { blockedSlots, overlayEvents };
  }

  for (const event of events) {
    let eventStart: Date | null = null;
    let eventEnd: Date | null = null;

    if (event.start?.dateTime) {
      eventStart = new Date(event.start.dateTime);
    } else if (event.start?.date) {
      // All-day event starts at midnight SGT of date
      eventStart = new Date(`${event.start.date}T00:00:00+08:00`);
    }

    if (event.end?.dateTime) {
      eventEnd = new Date(event.end.dateTime);
    } else if (event.end?.date) {
      // All-day event ends at midnight SGT of date (exclusive)
      eventEnd = new Date(`${event.end.date}T00:00:00+08:00`);
    }

    if (!eventStart || !eventEnd || isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) {
      continue;
    }

    const evStart = eventStart.getTime();
    const evEnd = eventEnd.getTime();
    const eventSlotIndices: number[] = [];

    dates.forEach((_, dayIdx) => {
      const dayStartMs = dayStartOffsets[dayIdx]!;
      const dayEndMs = dayStartMs + slotsPerDay * slotMs;

      // Check if event overlaps day's grid hours at all
      if (evStart >= dayEndMs || evEnd <= dayStartMs) {
        return;
      }

      for (let s = 0; s < slotsPerDay; s++) {
        const slotStartMs = dayStartMs + s * slotMs;
        const slotEndMs = slotStartMs + slotMs;

        // Standard interval overlap: [slotStartMs, slotEndMs) overlaps [evStart, evEnd)
        if (slotStartMs < evEnd && evStart < slotEndMs) {
          const slotIndex = dayIdx * slotsPerDay + s;
          blockedSlots.add(slotIndex);
          eventSlotIndices.push(slotIndex);
        }
      }
    });

    if (eventSlotIndices.length > 0) {
      const summary = event.summary?.trim();
      overlayEvents.push({
        title: summary ?? "(No title)",
        slotIndices: eventSlotIndices,
      });
    }
  }

  return { blockedSlots, overlayEvents };
}

export interface UseGoogleCalendarOverlayOptions {
  startDate: string | Date;
  endDate: string | Date;
  startHour?: number;
  endHour?: number;
  slotMinutes?: number;
  clientId?: string;
  timeoutMs?: number; // default 5000ms
}

export interface UseGoogleCalendarOverlayReturn {
  isSyncing: boolean;
  isConnected: boolean;
  error: string | null;
  blockedSlots: Set<number>;
  googleEvents: GoogleOverlayEvent[];
  syncCalendar: (token?: string) => Promise<void>;
  clearEvents: () => void;
}

// Global declaration for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: unknown }) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

/**
 * Hook to integrate Google Calendar via ephemeral client-side GIS token
 * and fetch calendar events with a mandatory 5-second AbortController timeout.
 */
export function useGoogleCalendarOverlay({
  startDate,
  endDate,
  startHour = 8,
  endHour = 22,
  slotMinutes = 15,
  clientId,
  timeoutMs = 5000,
}: UseGoogleCalendarOverlayOptions): UseGoogleCalendarOverlayReturn {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedSlots, setBlockedSlots] = useState<Set<number>>(() => new Set());
  const [googleEvents, setGoogleEvents] = useState<GoogleOverlayEvent[]>([]);

  const activeControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up in-flight controllers on unmount
  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
    };
  }, []);

  const fetchCalendarEvents = useCallback(
    async (token: string) => {
      setIsSyncing(true);
      setError(null);

      // Mandatory 5-Second Timeout Invariant
      const controller = new AbortController();
      activeControllerRef.current = controller;

      const timer = setTimeout(() => {
        controller.abort();
      }, timeoutMs);
      timeoutIdRef.current = timer;

      try {
        const startIso = toIsoDateString(startDate);
        const endIso = toIsoDateString(endDate);

        const timeMin = new Date(`${startIso}T00:00:00+08:00`).toISOString();
        const timeMax = new Date(`${endIso}T23:59:59.999+08:00`).toISOString();

        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
          timeMin,
        )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Google Calendar API responded with status ${res.status}`);
        }

        const data = (await res.json()) as { items?: GoogleCalendarEventItem[] };
        const items = data.items ?? [];

        const { blockedSlots: mappedBlocked, overlayEvents: mappedEvents } =
          mapGoogleEventsToSlots({
            events: items,
            startDate,
            endDate,
            startHour,
            endHour,
            slotMinutes,
          });

        setBlockedSlots(mappedBlocked);
        setGoogleEvents(mappedEvents);
        setIsConnected(true);
        toast.success(`Synced ${mappedEvents.length} calendar event${mappedEvents.length === 1 ? "" : "s"}`);
      } catch (err: unknown) {
        const isAbort =
          (typeof DOMException !== "undefined" &&
            err instanceof DOMException &&
            err.name === "AbortError") ||
          (err instanceof Error && err.name === "AbortError");

        if (isAbort) {
          toast.error("Google Calendar sync timed out (5s). Manual painting is still available.");
          setError("Google Calendar sync timed out (5s)");
        } else {
          const message = err instanceof Error ? err.message : "Failed to sync Google Calendar";
          toast.error(message);
          setError(message);
        }
      } finally {
        clearTimeout(timer);
        timeoutIdRef.current = null;
        activeControllerRef.current = null;
        setIsSyncing(false);
      }
    },
    [startDate, endDate, startHour, endHour, slotMinutes, timeoutMs],
  );

  const syncCalendar = useCallback(
    async (providedToken?: string) => {
      if (providedToken) {
        await fetchCalendarEvents(providedToken);
        return;
      }

      // Client-side GIS flow
      const effectiveClientId =
        clientId ??
        (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID : undefined);

      if (
        typeof window !== "undefined" &&
        window.google?.accounts?.oauth2 &&
        effectiveClientId
      ) {
        setIsSyncing(true);
        try {
          const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: effectiveClientId,
            scope: "https://www.googleapis.com/auth/calendar.events.readonly",
            callback: (response) => {
              if (response.error) {
                setIsSyncing(false);
                setError("Google Calendar authorization was cancelled or failed");
                toast.error("Google Calendar authorization was cancelled");
                return;
              }
              if (response.access_token) {
                void fetchCalendarEvents(response.access_token);
              } else {
                setIsSyncing(false);
              }
            },
          });
          tokenClient.requestAccessToken({ prompt: "" });
        } catch (initErr) {
          setIsSyncing(false);
          const msg = initErr instanceof Error ? initErr.message : "Could not initialize Google client";
          setError(msg);
          toast.error(msg);
        }
      } else {
        toast.error("Google Calendar integration is not available in this environment.");
      }
    },
    [clientId, fetchCalendarEvents],
  );

  const clearEvents = useCallback(() => {
    setBlockedSlots(new Set());
    setGoogleEvents([]);
    setIsConnected(false);
    setError(null);
  }, []);

  return {
    isSyncing,
    isConnected,
    error,
    blockedSlots,
    googleEvents,
    syncCalendar,
    clearEvents,
  };
}
