// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import {
  computeFreeSlots,
  mapTimetableSlotsToOverlay,
  useActiveTimetableOverlay,
  type TimetableSlotLike,
} from "./useActiveTimetableOverlay";

// Mock trpc
const mockUseQuery = vi.fn();
vi.mock("@/common/tools/trpc/react", () => ({
  api: {
    timetable: {
      getMyTimetableDetail: {
        useQuery: (...args: unknown[]) => mockUseQuery(...args) as unknown,
      },
    },
  },
}));

describe("mapTimetableSlotsToOverlay (pure algorithm)", () => {
  const sampleSlot: TimetableSlotLike = {
    classId: "cls-1",
    courseId: "course-1",
    courseCode: "IS216",
    section: "G1",
    dayOfWeek: "MON",
    startTime: "08:15",
    endTime: "11:30",
  };

  it("maps Monday class slots to linear slot indices on a Monday date", () => {
    // 2026-10-05 is a Monday
    const result = mapTimetableSlotsToOverlay({
      slots: [sampleSlot],
      startDate: "2026-10-05",
      endDate: "2026-10-05",
      startHour: 8,
      endHour: 22,
      slotMinutes: 15,
    });

    // 08:00 is slot 0
    // 08:15–08:30 is slot 1
    // 11:15–11:30 is slot 13
    // 11:30 is slot 14 (not overlapping [08:15, 11:30))
    expect(result.blockedSlots.has(0)).toBe(false);
    expect(result.blockedSlots.has(1)).toBe(true);
    expect(result.blockedSlots.has(13)).toBe(true);
    expect(result.blockedSlots.has(14)).toBe(false);
    expect(result.blockedSlots.size).toBe(13); // slots 1 through 13

    expect(result.overlayEvents).toHaveLength(1);
    expect(result.overlayEvents[0]).toEqual({
      title: "IS216 G1",
      courseCode: "IS216",
      section: "G1",
      slotIndices: Array.from({ length: 13 }, (_, i) => i + 1),
    });
  });

  it("returns no blocked slots when dates do not match class day of week", () => {
    // 2026-10-06 is a Tuesday
    const result = mapTimetableSlotsToOverlay({
      slots: [sampleSlot],
      startDate: "2026-10-06",
      endDate: "2026-10-06",
      startHour: 8,
      endHour: 22,
      slotMinutes: 15,
    });

    expect(result.blockedSlots.size).toBe(0);
    expect(result.overlayEvents).toHaveLength(0);
  });

  it("maps recurring Monday classes across a two-week meeting window", () => {
    // 2026-10-05 (Mon) to 2026-10-12 (Mon) = 8 days
    const result = mapTimetableSlotsToOverlay({
      slots: [sampleSlot],
      startDate: "2026-10-05",
      endDate: "2026-10-12",
      startHour: 8,
      endHour: 22,
      slotMinutes: 15,
    });

    const slotsPerDay = (22 - 8) * 4; // 56 slots per day

    // Day 0 (2026-10-05, Mon): slots 1..13
    expect(result.blockedSlots.has(1)).toBe(true);
    // Day 7 (2026-10-12, Mon): offset = 7 * slotsPerDay
    expect(result.blockedSlots.has(7 * slotsPerDay + 1)).toBe(true);
    expect(result.blockedSlots.has(392 + 13)).toBe(true);

    expect(result.overlayEvents).toHaveLength(2);
    expect(result.overlayEvents[0]!.slotIndices[0]).toBe(1);
    expect(result.overlayEvents[1]!.slotIndices[0]).toBe(393);
  });

  it("handles classes that start before startHour or extend past endHour", () => {
    const earlySlot: TimetableSlotLike = {
      courseCode: "EARLY",
      dayOfWeek: "MON",
      startTime: "07:00",
      endTime: "09:00",
    };

    const result = mapTimetableSlotsToOverlay({
      slots: [earlySlot],
      startDate: "2026-10-05",
      endDate: "2026-10-05",
      startHour: 8,
      endHour: 22,
      slotMinutes: 15,
    });

    // Grid starts at 08:00 (slot 0). 07:00–08:00 is clipped.
    // 08:00–09:00 covers slots 0, 1, 2, 3 (4 slots).
    expect(result.blockedSlots.size).toBe(4);
    expect(result.blockedSlots.has(0)).toBe(true);
    expect(result.blockedSlots.has(3)).toBe(true);
    expect(result.blockedSlots.has(4)).toBe(false);
  });

  it("safely skips slots with invalid time strings or missing days", () => {
    const malformedSlots: TimetableSlotLike[] = [
      { courseCode: "BAD1", startTime: "invalid", endTime: "10:00", dayOfWeek: "MON" },
      { courseCode: "BAD2", startTime: "09:00", endTime: "invalid", dayOfWeek: "MON" },
      { courseCode: "BAD3", startTime: "09:00", endTime: "10:00", dayOfWeek: null },
    ];

    const result = mapTimetableSlotsToOverlay({
      slots: malformedSlots,
      startDate: "2026-10-05",
      endDate: "2026-10-05",
    });

    expect(result.blockedSlots.size).toBe(0);
    expect(result.overlayEvents).toHaveLength(0);
  });
});

describe("computeFreeSlots (1-click autofill math)", () => {
  it("returns all slots when there are no blocked slots", () => {
    const free = computeFreeSlots(10);
    expect(free).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("filters out both timetable and external calendar blocked slots", () => {
    const timetableBlocked = new Set([1, 2, 5]);
    const googleBlocked = new Set([5, 6, 9]);

    const free = computeFreeSlots(10, timetableBlocked, googleBlocked);
    expect(free).toEqual([0, 3, 4, 7, 8]);
  });

  it("works with arrays as inputs", () => {
    const free = computeFreeSlots(5, [0, 2], [2, 4]);
    expect(free).toEqual([1, 3]);
  });
});

describe("useActiveTimetableOverlay (React hook)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("populates blockedSlots and overlayEvents when query resolves", () => {
    mockUseQuery.mockReturnValue({
      data: {
        timetableId: "tt-1",
        name: "Plan A",
        slots: [
          {
            classId: "c1",
            courseCode: "CS101",
            section: "G2",
            dayOfWeek: "Mon",
            startTime: "09:00",
            endTime: "10:00",
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() =>
      useActiveTimetableOverlay({
        startDate: "2026-10-05",
        endDate: "2026-10-05",
        startHour: 8,
        endHour: 22,
        slotMinutes: 15,
        acadTermId: "term-1",
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.timetableId).toBe("tt-1");
    expect(result.current.timetableName).toBe("Plan A");
    // 09:00 to 10:00 is 1 hour = 4 slots: 09:00 (slot 4), 09:15 (slot 5), 09:30 (slot 6), 09:45 (slot 7)
    expect(result.current.blockedSlots.size).toBe(4);
    expect(result.current.blockedSlots.has(4)).toBe(true);
    expect(result.current.blockedSlots.has(7)).toBe(true);
    expect(result.current.overlayEvents).toHaveLength(1);
    expect(result.current.overlayEvents[0]?.title).toBe("CS101 G2");
  });

  it("returns empty blockedSlots when no data is returned", () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() =>
      useActiveTimetableOverlay({
        startDate: "2026-10-05",
        endDate: "2026-10-05",
      }),
    );

    expect(result.current.blockedSlots.size).toBe(0);
    expect(result.current.overlayEvents).toHaveLength(0);
  });
});
