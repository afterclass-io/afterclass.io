"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { env } from "@/env";
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
  transparency?: string;
  attendees?: { self?: boolean; responseStatus?: string }[];
}

/** Read-only access to the viewer's calendar events; nothing is stored server-side. */
export const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events.readonly";

const CALENDAR_EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

// Ask Google for only the fields we read; the rest of each event stays put.
const EVENT_FIELDS =
  "nextPageToken,items(id,summary,start,end,transparency,attendees(self,responseStatus))";

// Google returns 250 events per page; two weeks of calendar fits in a few pages.
const MAX_EVENT_PAGES = 10;

/**
 * Mirrors Timeful: an event leaves the viewer free when it is marked "Show as
 * free", or when the viewer is an invitee who has not accepted it.
 */
function isFreeEvent(event: GoogleCalendarEventItem): boolean {
  if (event.transparency === "transparent") return true;
  const self = event.attendees?.find((attendee) => attendee.self);
  return self !== undefined && self.responseStatus !== "accepted";
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
    if (isFreeEvent(event)) continue;

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

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}

// Global declaration for Google Identity Services (https://accounts.google.com/gsi/client)
declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: { type: string }) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
          hasGrantedAllScopes: (
            response: GoogleTokenResponse,
            firstScope: string,
            ...restScopes: string[]
          ) => boolean;
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

        const items: GoogleCalendarEventItem[] = [];
        let pageToken: string | undefined;

        for (let page = 0; page < MAX_EVENT_PAGES; page++) {
          const params = new URLSearchParams({
            timeMin,
            timeMax,
            singleEvents: "true",
            maxResults: "250",
            fields: EVENT_FIELDS,
          });
          // Regular and out-of-office events only: focus time, working
          // location and birthdays would otherwise block whole days.
          params.append("eventTypes", "default");
          params.append("eventTypes", "outOfOffice");
          if (pageToken) params.set("pageToken", pageToken);

          const res = await fetch(`${CALENDAR_EVENTS_URL}?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });

          if (!res.ok) {
            throw new Error(`Google Calendar API responded with status ${res.status}`);
          }

          const data = (await res.json()) as {
            items?: GoogleCalendarEventItem[];
            nextPageToken?: string;
          };
          items.push(...(data.items ?? []));
          pageToken = data.nextPageToken;
          if (!pageToken) break;
        }

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
      const effectiveClientId = clientId ?? env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const oauth2 =
        typeof window === "undefined" ? undefined : window.google?.accounts?.oauth2;

      if (!effectiveClientId) {
        toast.error("Google Calendar sync is not configured.");
        return;
      }
      if (!oauth2) {
        toast.error("Google sign-in is still loading. Try again in a moment.");
        return;
      }

      setIsSyncing(true);
      try {
        const tokenClient = oauth2.initTokenClient({
          client_id: effectiveClientId,
          scope: GOOGLE_CALENDAR_SCOPE,
          callback: (response) => {
            if (response.error || !response.access_token) {
              setIsSyncing(false);
              setError("Google Calendar authorization was cancelled or failed");
              toast.error("Google Calendar authorization was cancelled");
              return;
            }
            // The consent screen lets people untick individual scopes.
            if (!oauth2.hasGrantedAllScopes(response, GOOGLE_CALENDAR_SCOPE)) {
              setIsSyncing(false);
              setError("Calendar access was not granted");
              toast.error("Allow access to calendar events to sync your Google Calendar");
              return;
            }
            void fetchCalendarEvents(response.access_token);
          },
          // The callback never fires when the popup is closed or blocked.
          error_callback: (popupError) => {
            setIsSyncing(false);
            if (popupError.type === "popup_failed_to_open") {
              toast.error("Allow pop-ups for this site to connect Google Calendar");
            }
          },
        });
        tokenClient.requestAccessToken();
      } catch (initErr) {
        setIsSyncing(false);
        const msg = initErr instanceof Error ? initErr.message : "Could not initialize Google client";
        setError(msg);
        toast.error(msg);
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
