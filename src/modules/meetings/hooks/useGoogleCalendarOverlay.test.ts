// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { toast } from "sonner";

import {
  mapGoogleEventsToSlots,
  useGoogleCalendarOverlay,
  type GoogleCalendarEventItem,
} from "./useGoogleCalendarOverlay";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("mapGoogleEventsToSlots (pure algorithm)", () => {
  it("maps a 1-hour event to four 15-minute slot indices", () => {
    // Single day: 2026-10-06
    const event: GoogleCalendarEventItem = {
      summary: "Team Standup",
      start: { dateTime: "2026-10-06T09:00:00+08:00" },
      end: { dateTime: "2026-10-06T10:00:00+08:00" },
    };

    const { blockedSlots, overlayEvents } = mapGoogleEventsToSlots({
      events: [event],
      startDate: "2026-10-06",
      endDate: "2026-10-06",
      startHour: 8,
      endHour: 22,
      slotMinutes: 15,
    });

    // 08:00 is slot 0
    // 09:00 is slot 4 (1h after 08:00 = 4 slots)
    // 09:00–10:00 covers slots 4, 5, 6, 7
    expect(blockedSlots.size).toBe(4);
    expect(blockedSlots.has(4)).toBe(true);
    expect(blockedSlots.has(5)).toBe(true);
    expect(blockedSlots.has(6)).toBe(true);
    expect(blockedSlots.has(7)).toBe(true);
    expect(blockedSlots.has(8)).toBe(false);

    expect(overlayEvents).toHaveLength(1);
    expect(overlayEvents[0]).toEqual({
      title: "Team Standup",
      slotIndices: [4, 5, 6, 7],
    });
  });

  it("maps all-day event to cover all slots in the day", () => {
    const allDayEvent: GoogleCalendarEventItem = {
      summary: "Public Holiday",
      start: { date: "2026-10-06" },
      end: { date: "2026-10-07" },
    };

    const { blockedSlots, overlayEvents } = mapGoogleEventsToSlots({
      events: [allDayEvent],
      startDate: "2026-10-06",
      endDate: "2026-10-06",
      startHour: 8,
      endHour: 22,
      slotMinutes: 15,
    });

    const slotsPerDay = (22 - 8) * 4; // 56 slots
    expect(blockedSlots.size).toBe(slotsPerDay);
    expect(overlayEvents).toHaveLength(1);
    expect(overlayEvents[0]?.slotIndices).toHaveLength(slotsPerDay);
  });

  it("handles events outside the poll window or after daily hours", () => {
    const lateNightEvent: GoogleCalendarEventItem = {
      summary: "Late Night Gaming",
      start: { dateTime: "2026-10-06T23:00:00+08:00" },
      end: { dateTime: "2026-10-07T01:00:00+08:00" },
    };

    const { blockedSlots, overlayEvents } = mapGoogleEventsToSlots({
      events: [lateNightEvent],
      startDate: "2026-10-06",
      endDate: "2026-10-06",
      startHour: 8,
      endHour: 22,
      slotMinutes: 15,
    });

    expect(blockedSlots.size).toBe(0);
    expect(overlayEvents).toHaveLength(0);
  });

  it("ignores malformed events with missing or invalid dates", () => {
    const malformedEvents: GoogleCalendarEventItem[] = [
      { summary: "No start", end: { dateTime: "2026-10-06T10:00:00Z" } },
      { summary: "Invalid date", start: { dateTime: "nonsense" }, end: { dateTime: "nonsense" } },
    ];

    const { blockedSlots, overlayEvents } = mapGoogleEventsToSlots({
      events: malformedEvents,
      startDate: "2026-10-06",
      endDate: "2026-10-06",
    });

    expect(blockedSlots.size).toBe(0);
    expect(overlayEvents).toHaveLength(0);
  });
});

describe("useGoogleCalendarOverlay (hook & timeout invariant)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it("successfully fetches events with provided token and maps slots", async () => {
    const mockEvents: GoogleCalendarEventItem[] = [
      {
        summary: "Project Review",
        start: { dateTime: "2026-10-06T14:00:00+08:00" },
        end: { dateTime: "2026-10-06T15:00:00+08:00" },
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: mockEvents }),
    });

    const { result } = renderHook(() =>
      useGoogleCalendarOverlay({
        startDate: "2026-10-06",
        endDate: "2026-10-06",
        startHour: 8,
        endHour: 22,
        slotMinutes: 15,
      }),
    );

    await act(async () => {
      await result.current.syncCalendar("mock-token-xyz");
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://www.googleapis.com/calendar/v3/calendars/primary/events"),
      expect.objectContaining({
        headers: { Authorization: "Bearer mock-token-xyz" },
      }),
    );

    expect(result.current.isConnected).toBe(true);
    expect(result.current.googleEvents).toHaveLength(1);
    expect(result.current.googleEvents[0]?.title).toBe("Project Review");
    expect(toast.success).toHaveBeenCalledWith("Synced 1 calendar event");
  });

  it("enforces mandatory 5-second timeout and triggers specific error toast when aborted", async () => {
    // Simulate a fetch that aborts after timeout
    globalThis.fetch = vi.fn().mockImplementation((_url, init: RequestInit) => {
      return new Promise((_, reject) => {
        if (init?.signal) {
          init.signal.addEventListener("abort", () => {
            const err = new DOMException("The user aborted a request.", "AbortError");
            reject(err);
          });
        }
      });
    });

    // Use a small timeoutMs (e.g. 50ms) to test timeout behavior reliably
    const { result } = renderHook(() =>
      useGoogleCalendarOverlay({
        startDate: "2026-10-06",
        endDate: "2026-10-06",
        timeoutMs: 50,
      }),
    );

    await act(async () => {
      await result.current.syncCalendar("slow-token");
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Google Calendar sync timed out (5s). Manual painting is still available.",
    );
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.error).toBe("Google Calendar sync timed out (5s)");
  });

  it("handles non-abort HTTP errors cleanly", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    });

    const { result } = renderHook(() =>
      useGoogleCalendarOverlay({
        startDate: "2026-10-06",
        endDate: "2026-10-06",
      }),
    );

    await act(async () => {
      await result.current.syncCalendar("bad-token");
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Google Calendar API responded with status 403",
    );
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.error).toContain("403");
  });

  it("clears events when clearEvents is called", async () => {
    const mockEvents: GoogleCalendarEventItem[] = [
      {
        summary: "Meeting",
        start: { dateTime: "2026-10-06T10:00:00+08:00" },
        end: { dateTime: "2026-10-06T11:00:00+08:00" },
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: mockEvents }),
    });

    const { result } = renderHook(() =>
      useGoogleCalendarOverlay({
        startDate: "2026-10-06",
        endDate: "2026-10-06",
      }),
    );

    await act(async () => {
      await result.current.syncCalendar("mock-token");
    });

    expect(result.current.googleEvents).toHaveLength(1);

    act(() => {
      result.current.clearEvents();
    });

    expect(result.current.googleEvents).toHaveLength(0);
    expect(result.current.blockedSlots.size).toBe(0);
    expect(result.current.isConnected).toBe(false);
  });
});
