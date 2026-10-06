import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/server/auth/config";
import type { ToolContext } from "../../types";
import {
  getMeetingPollDetailTool,
  suggestMeetingTimesTool,
} from "./meetings";

const fakeUser: SessionUser = {
  id: "u1",
  email: "a@smu.edu.sg",
  username: "u1",
  isVerified: true,
  aiConsent: null,
  universityId: 1,
  firstName: null,
  lastName: null,
  telegramId: null,
  photoUrl: null,
  facultyId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const IS215_DETAIL = {
  poll: {
    id: "d3b07384-d113-4603-a1c7-c752b7194601",
    slug: "xK9mP2vL7q",
    title: "IS215 Group Project Sync",
    description: "Coordination for Sprint 1 milestones and deliverables.",
    agenda: null,
    links: [],
    isCreator: true,
    startDate: new Date("2026-10-12T00:00:00.000Z"),
    endDate: new Date("2026-10-16T00:00:00.000Z"),
    startHour: 8,
    endHour: 22,
    slotDurationMinutes: 15,
    course: null,
    section: "G1",
    teamIdentifier: "Team 3",
    acadTerm: null,
  },
  participants: [
    {
      participantId: "e4a18274-9843-4e3a-9694-555566667777",
      name: "Jordan Teo",
      availableSlots: [0, 1, 2, 3, 8, 9, 10, 11],
      ifNeededSlots: [4, 5, 12, 13],
      isCurrentUser: true,
    },
    {
      participantId: "f5b29385-a954-4f4b-a705-666677778888",
      name: "Alice Tan",
      availableSlots: [0, 1, 8, 9, 16, 17],
      ifNeededSlots: [2, 3, 10, 11],
      isCurrentUser: false,
    },
    {
      participantId: "f5b29385-a954-4f4b-a705-666677778889",
      name: "Ben Lim",
      availableSlots: [0, 1, 2, 8, 9, 10, 16, 17],
      ifNeededSlots: [3, 11],
      isCurrentUser: false,
    },
    {
      participantId: "f5b29385-a954-4f4b-a705-666677778890",
      name: "Chloe Ong",
      availableSlots: [8, 9, 10, 11, 16, 17],
      ifNeededSlots: [0, 1],
      isCurrentUser: false,
    },
  ],
  heatmap: {},
};

function makeCtx(getPollBySlug: ReturnType<typeof vi.fn>): ToolContext {
  return {
    user: fakeUser,
    caller: {
      meetings: {
        getPollBySlug,
      },
    } as unknown as ToolContext["caller"],
  };
}

describe("IS215 acceptance replay", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-06T11:30:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("one suggest-meeting-times call names who can make the top option", async () => {
    const getPollFn = vi.fn().mockResolvedValue(IS215_DETAIL);
    const ctx = makeCtx(getPollFn);

    const result = await suggestMeetingTimesTool.run(ctx, {
      slug: "xK9mP2vL7q",
    });

    expect(getPollFn).toHaveBeenCalledTimes(1);
    expect(getPollFn).toHaveBeenCalledWith({ slug: "xK9mP2vL7q" });
    expect(result.isError).toBeFalsy();

    const rawText = result.content.find((c) => c.type === "text")?.text ?? "{}";
    expect(rawText).not.toContain("e4a18274-9843-4e3a-9694-555566667777");
    expect(rawText).not.toContain("f5b29385-a954-4f4b-a705-666677778888");
    expect(rawText).not.toContain("f5b29385-a954-4f4b-a705-666677778889");
    expect(rawText).not.toContain("f5b29385-a954-4f4b-a705-666677778890");
    expect(rawText).not.toContain("Slots");

    const parsed = JSON.parse(rawText) as {
      participants: { total: number; noResponse: string[] };
      nobodyCanAttend: boolean;
      options: unknown[];
      bestPerDay: unknown[];
    };

    expect(parsed.participants).toEqual({
      total: 4,
      noResponse: [],
    });
    expect(parsed.nobodyCanAttend).toBe(false);

    expect(parsed.options).toEqual([
      {
        date: "2026-10-12",
        weekday: "Mon",
        start: "10:00",
        end: "11:00",
        startRange: { earliest: "10:00", latest: "10:00" },
        free: ["Jordan Teo", "Chloe Ong"],
        ifNeeded: ["Alice Tan", "Ben Lim"],
        unavailable: [],
        attendable: 4,
        total: 4,
      },
      {
        date: "2026-10-12",
        weekday: "Mon",
        start: "08:00",
        end: "09:00",
        startRange: { earliest: "08:00", latest: "08:00" },
        free: ["Jordan Teo"],
        ifNeeded: ["Alice Tan", "Ben Lim"],
        unavailable: ["Chloe Ong"],
        attendable: 3,
        total: 4,
      },
      {
        date: "2026-10-12",
        weekday: "Mon",
        start: "08:15",
        end: "09:15",
        startRange: { earliest: "08:15", latest: "08:30" },
        free: [],
        ifNeeded: ["Jordan Teo"],
        unavailable: ["Alice Tan", "Ben Lim", "Chloe Ong"],
        attendable: 1,
        total: 4,
      },
      {
        date: "2026-10-12",
        weekday: "Mon",
        start: "10:15",
        end: "11:15",
        startRange: { earliest: "10:15", latest: "10:30" },
        free: [],
        ifNeeded: ["Jordan Teo"],
        unavailable: ["Alice Tan", "Ben Lim", "Chloe Ong"],
        attendable: 1,
        total: 4,
      },
    ]);

    expect(parsed.bestPerDay).toHaveLength(5);
    expect(parsed.bestPerDay[0]).toEqual(parsed.options[0]);

    const remainingDays = [
      { date: "2026-10-13", weekday: "Tue" },
      { date: "2026-10-14", weekday: "Wed" },
      { date: "2026-10-15", weekday: "Thu" },
      { date: "2026-10-16", weekday: "Fri" },
    ];

    for (let i = 0; i < remainingDays.length; i++) {
      const dayInfo = remainingDays[i]!;
      expect(parsed.bestPerDay[i + 1]).toEqual({
        date: dayInfo.date,
        weekday: dayInfo.weekday,
        start: "08:00",
        end: "09:00",
        startRange: { earliest: "08:00", latest: "21:00" },
        free: [],
        ifNeeded: [],
        unavailable: ["Jordan Teo", "Alice Tan", "Ben Lim", "Chloe Ong"],
        attendable: 0,
        total: 4,
      });
    }
  });

  it("weekend question on a weekday-only poll gets a clear error", async () => {
    const getPollFn = vi.fn().mockResolvedValue(IS215_DETAIL);
    const ctx = makeCtx(getPollFn);

    const result = await suggestMeetingTimesTool.run(ctx, {
      slug: "xK9mP2vL7q",
      daysOfWeek: ["sat", "sun"],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toBe(
      "No poll days match the requested dates/days. The poll runs 2026-10-12 (Mon) to 2026-10-16 (Fri).",
    );
  });

  it("detail shows ranges instead of counts", async () => {
    const getPollFn = vi.fn().mockResolvedValue(IS215_DETAIL);
    const ctx = makeCtx(getPollFn);

    const result = await getMeetingPollDetailTool.run(ctx, {
      slug: "xK9mP2vL7q",
    });

    expect(result.isError).toBeFalsy();

    const rawText = result.content.find((c) => c.type === "text")?.text ?? "{}";
    const parsed = JSON.parse(rawText) as {
      respondedCount: number;
      participants: Array<{
        availability: Array<{
          date: string;
          start: string;
          end: string;
          status: string;
        }>;
      }>;
    };

    expect(parsed.respondedCount).toBe(4);
    expect(parsed.participants[0]?.availability).toEqual([
      { date: "2026-10-12", start: "08:00", end: "09:00", status: "available" },
      { date: "2026-10-12", start: "09:00", end: "09:30", status: "ifNeeded" },
      { date: "2026-10-12", start: "10:00", end: "11:00", status: "available" },
      { date: "2026-10-12", start: "11:00", end: "11:30", status: "ifNeeded" },
    ]);
    expect(parsed.participants[3]?.availability).toEqual([
      { date: "2026-10-12", start: "08:00", end: "08:30", status: "ifNeeded" },
      { date: "2026-10-12", start: "10:00", end: "11:00", status: "available" },
      { date: "2026-10-12", start: "12:00", end: "12:30", status: "available" },
    ]);
  });
});
