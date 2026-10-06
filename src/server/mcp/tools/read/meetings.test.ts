import { describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/server/auth/config";
import type { ToolContext } from "../../types";
import {
  getMyMeetingsTool,
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

function makeCtx(listMyMeetings: ReturnType<typeof vi.fn>): ToolContext {
  return {
    user: fakeUser,
    caller: {
      meetings: {
        listMyMeetings,
      },
    } as unknown as ToolContext["caller"],
  };
}

describe("getMyMeetingsTool", () => {
  it("returns formatted meetings list limited by input limit with ISO dates and hasResponded", async () => {
    const mockMeetings = [
      {
        id: "m1",
        slug: "slug-1",
        title: "CS101 Project Sync",
        description: "Initial brainstorm",
        startDate: new Date("2026-10-10"),
        endDate: new Date("2026-10-12"),
        startHour: 8,
        endHour: 22,
        slotDurationMinutes: 15,
        isCreator: true,
        course: { id: "c1", code: "CS101", name: "Programming Fundamentals" },
        section: "G1",
        teamIdentifier: "Team Alpha",
        participantCount: 4,
        hasResponded: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "m2",
        slug: "slug-2",
        title: "IS215 Team Meeting",
        description: null,
        startDate: new Date("2026-10-15"),
        endDate: new Date("2026-10-16"),
        startHour: 10,
        endHour: 18,
        slotDurationMinutes: 15,
        isCreator: false,
        course: null,
        section: null,
        teamIdentifier: null,
        participantCount: 3,
        hasResponded: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const listFn = vi.fn().mockResolvedValue(mockMeetings);
    const ctx = makeCtx(listFn);

    const result = await getMyMeetingsTool.run(ctx, { limit: 2 });
    expect(listFn).toHaveBeenCalled();

    const text = result.content.find((c) => c.type === "text")?.text ?? "{}";
    const parsed = JSON.parse(text) as {
      total: number;
      meetings: Array<{
        slug: string;
        url: string;
        startDate: string;
        hasResponded: boolean;
      }>;
    };
    expect(parsed.total).toBe(2);
    expect(parsed.meetings).toHaveLength(2);
    expect(parsed.meetings[0]?.slug).toBe("slug-1");
    expect(parsed.meetings[0]?.startDate).toBe("2026-10-10");
    expect(parsed.meetings[0]?.hasResponded).toBe(true);
    expect(parsed.meetings[1]?.hasResponded).toBe(false);
    expect(parsed.meetings[0]).not.toHaveProperty("status");
    expect(parsed.meetings[0]).not.toHaveProperty("finalizedSlot");
    expect(parsed.meetings[0]?.url).toBe("/meetings/slug-1");
  });

  it("handles errors from caller gracefully", async () => {
    const listFn = vi.fn().mockRejectedValue(new Error("Database connection lost"));
    const ctx = makeCtx(listFn);

    const result = await getMyMeetingsTool.run(ctx, {});
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("Database connection lost");
  });
});

describe("getMeetingPollDetailTool", () => {
  it("returns window and availability ranges", async () => {
    const mockDetail = {
      poll: {
        id: "p1",
        slug: "meeting-101",
        title: "Sprint Retrospective",
        description: "Review sprint goals",
        agenda: "Action items",
        links: ["https://meet.google.com/xyz"],
        isCreator: true,
        startDate: new Date("2026-10-12T00:00:00.000Z"),
        endDate: new Date("2026-10-13T00:00:00.000Z"),
        startHour: 8,
        endHour: 22,
        slotDurationMinutes: 15,
        course: null,
        section: null,
        teamIdentifier: "Core Team",
        acadTerm: null,
      },
      participants: [
        {
          participantId: "part-1",
          name: "Alice Tan",
          availableSlots: [0, 1, 2, 3, 64],
          ifNeededSlots: [4, 5],
          isCurrentUser: true,
        },
        {
          participantId: "part-2",
          name: "Ben Lim",
          availableSlots: [],
          ifNeededSlots: [],
          isCurrentUser: false,
        },
      ],
      heatmap: {},
    };

    const getPollFn = vi.fn().mockResolvedValue(mockDetail);
    const ctx: ToolContext = {
      user: fakeUser,
      caller: {
        meetings: {
          getPollBySlug: getPollFn,
        },
      } as unknown as ToolContext["caller"],
    };

    const result = await getMeetingPollDetailTool.run(ctx, {
      slug: "meeting-101",
    });
    expect(getPollFn).toHaveBeenCalledWith({ slug: "meeting-101" });
    expect(result.isError).toBeFalsy();

    const rawText =
      result.content.find((c) => c.type === "text")?.text ?? "{}";
    expect(rawText).not.toContain("Slots");
    expect(rawText).not.toContain("heatmap");
    expect(rawText).not.toContain("participantId");
    expect(rawText).not.toContain("p1");

    const parsed = JSON.parse(rawText) as {
      poll: {
        slug: string;
        title: string;
        description: string | null;
        agenda: string | null;
        links: string[];
        isCreator: boolean;
        course: { code: string; name: string } | null;
        section: string | null;
        teamIdentifier: string | null;
        startDate: string;
        endDate: string;
        timezone: string;
      };
      window: {
        days: Array<{ date: string; weekday: string }>;
        startHour: number;
        endHour: number;
        slotMinutes: number;
      };
      participantCount: number;
      respondedCount: number;
      participants: Array<{
        name: string;
        isCurrentUser: boolean;
        hasResponded: boolean;
        availability: Array<{
          date: string;
          start: string;
          end: string;
          status: string;
        }>;
      }>;
      url: string;
    };

    expect(parsed.window).toEqual({
      days: [
        { date: "2026-10-12", weekday: "Mon" },
        { date: "2026-10-13", weekday: "Tue" },
      ],
      startHour: 8,
      endHour: 22,
      slotMinutes: 15,
    });
    expect(parsed.poll.startDate).toBe("2026-10-12");
    expect(parsed.poll.timezone).toBe("Asia/Singapore");
    expect(parsed.participantCount).toBe(2);
    expect(parsed.respondedCount).toBe(1);
    expect(parsed.participants[0]).toEqual({
      name: "Alice Tan",
      isCurrentUser: true,
      hasResponded: true,
      availability: [
        {
          date: "2026-10-12",
          start: "08:00",
          end: "09:00",
          status: "available",
        },
        {
          date: "2026-10-12",
          start: "09:00",
          end: "09:30",
          status: "ifNeeded",
        },
        {
          date: "2026-10-13",
          start: "10:00",
          end: "10:15",
          status: "available",
        },
      ],
    });
    expect(parsed.participants[1]).toEqual({
      name: "Ben Lim",
      isCurrentUser: false,
      hasResponded: false,
      availability: [],
    });
  });

  it("description no longer claims a heatmap", () => {
    expect(getMeetingPollDetailTool.description).not.toMatch(/heatmap/i);
    expect(getMeetingPollDetailTool.description).toContain(
      "suggest-meeting-times",
    );
  });

  it("returns errText when the poll is missing", async () => {
    const getPollFn = vi
      .fn()
      .mockRejectedValue(new Error("Meeting poll not found"));
    const ctx: ToolContext = {
      user: fakeUser,
      caller: {
        meetings: {
          getPollBySlug: getPollFn,
        },
      } as unknown as ToolContext["caller"],
    };

    const result = await getMeetingPollDetailTool.run(ctx, {
      slug: "nonexistent",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("Meeting poll not found");
  });
});

describe("suggestMeetingTimesTool", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-06T11:30:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockPoll = {
    id: "p1",
    slug: "abc1234567",
    title: "Sync",
    description: "Initial brainstorm",
    agenda: null,
    links: [],
    isCreator: true,
    startDate: new Date("2026-10-12T00:00:00.000Z"),
    endDate: new Date("2026-10-12T00:00:00.000Z"),
    startHour: 10,
    endHour: 12,
    slotDurationMinutes: 15,
    course: null,
    section: null,
    teamIdentifier: null,
    acadTerm: null,
  };

  const mockParticipants = [
    {
      participantId: "part-1",
      name: "Alice Tan",
      availableSlots: [0, 1, 2, 3, 4, 5, 6, 7],
      ifNeededSlots: [],
      isCurrentUser: true,
    },
    {
      participantId: "part-2",
      name: "Ben Lim",
      availableSlots: [0, 1, 2, 3],
      ifNeededSlots: [],
      isCurrentUser: false,
    },
    {
      participantId: "part-3",
      name: "Student",
      availableSlots: [],
      ifNeededSlots: [],
      isCurrentUser: false,
    },
    {
      participantId: "part-4",
      name: "Student",
      availableSlots: [],
      ifNeededSlots: [],
      isCurrentUser: false,
    },
  ];

  function makeSuggestCtx(getPollBySlug: ReturnType<typeof vi.fn>): ToolContext {
    return {
      user: fakeUser,
      caller: {
        meetings: {
          getPollBySlug,
        },
      } as unknown as ToolContext["caller"],
    };
  }

  it("returns ranked options with names and no ids", async () => {
    const getPollFn = vi.fn().mockResolvedValue({
      poll: mockPoll,
      participants: mockParticipants,
      heatmap: {},
    });
    const ctx = makeSuggestCtx(getPollFn);

    const result = await suggestMeetingTimesTool.run(ctx, {
      slug: "abc1234567",
    });
    expect(getPollFn).toHaveBeenCalledTimes(1);
    expect(getPollFn).toHaveBeenCalledWith({ slug: "abc1234567" });
    expect(result.isError).toBeFalsy();

    const rawText =
      result.content.find((c) => c.type === "text")?.text ?? "{}";
    expect(rawText).not.toContain("part-1");
    expect(rawText).not.toContain("Slots");
    expect(rawText).not.toContain("isCurrentUser");
    expect(rawText).not.toContain("participantId");

    const parsed = JSON.parse(rawText) as {
      poll: { slug: string; title: string; timezone: string; slotMinutes: number };
      asOf: string;
      participants: { total: number; noResponse: string[] };
      query: { durationMinutes?: number };
      options: Array<{
        date: string;
        weekday: string;
        start: string;
        end: string;
        startRange?: { earliest: string; latest: string };
        free: string[];
        ifNeeded: string[];
        unavailable: string[];
        attendable: number;
        total: number;
        tier: string;
        summary: string;
      }>;
      url: string;
    };
    expect(parsed.poll).toEqual({
      slug: "abc1234567",
      title: "Sync",
      timezone: "Asia/Singapore",
      slotMinutes: 15,
    });
    expect(parsed.asOf).toBe("2026-10-06T19:30:00+08:00");
    expect(parsed.participants).toEqual({
      total: 4,
      noResponse: ["Student", "Student 2"],
    });
    expect(parsed.query).toEqual({});
    expect(parsed.options[0]).toEqual({
      date: "2026-10-12",
      weekday: "Mon",
      start: "10:00",
      end: "11:00",
      free: ["Alice Tan", "Ben Lim"],
      ifNeeded: [],
      unavailable: ["Student", "Student 2"],
      attendable: 2,
      total: 4,
      tier: "partial",
      summary:
        "2 of 4 can attend: 2 free, 0 if needed; unavailable: Student, Student 2",
    });
    expect("startRange" in (parsed.options[0] ?? {})).toBe(false);
    expect(parsed.url).toBe("/meetings/abc1234567");
  });

  it("with durationMinutes it returns startRange", async () => {
    const getPollFn = vi.fn().mockResolvedValue({
      poll: mockPoll,
      participants: mockParticipants,
      heatmap: {},
    });
    const ctx = makeSuggestCtx(getPollFn);

    const result = await suggestMeetingTimesTool.run(ctx, {
      slug: "abc1234567",
      durationMinutes: 60,
    });
    expect(result.isError).toBeFalsy();
    const rawText =
      result.content.find((c) => c.type === "text")?.text ?? "{}";
    const parsed = JSON.parse(rawText) as {
      query: { durationMinutes: number };
      options: Array<{
        start: string;
        end: string;
        startRange?: { earliest: string; latest: string };
      }>;
    };
    expect(parsed.query).toEqual({ durationMinutes: 60 });
    expect(parsed.options[0]?.end).toBe("11:00");
    expect(parsed.options[0]?.startRange).toEqual({
      earliest: "10:00",
      latest: "10:00",
    });
  });

  it("echoes structured filters in query", async () => {
    const getPollFn = vi.fn().mockResolvedValue({
      poll: mockPoll,
      participants: mockParticipants,
      heatmap: {},
    });
    const ctx = makeSuggestCtx(getPollFn);

    const result = await suggestMeetingTimesTool.run(ctx, {
      slug: "abc1234567",
      daysOfWeek: ["mon"],
    });
    expect(result.isError).toBeFalsy();
    const rawText =
      result.content.find((c) => c.type === "text")?.text ?? "{}";
    const parsed = JSON.parse(rawText) as {
      query: { daysOfWeek: string[]; durationMinutes?: number };
    };
    expect(parsed.query).toEqual({
      daysOfWeek: ["mon"],
    });
  });

  it("description tells agents not to assume a duration and not to call if-needed people available", () => {
    expect(suggestMeetingTimesTool.description).toContain("omit durationMinutes");
    expect(suggestMeetingTimesTool.description).toContain("NOT available");
  });

  it("surfaces validation errors as errText", async () => {
    const getPollFn = vi.fn().mockResolvedValue({
      poll: mockPoll,
      participants: mockParticipants,
      heatmap: {},
    });
    const ctx = makeSuggestCtx(getPollFn);

    const result = await suggestMeetingTimesTool.run(ctx, {
      slug: "abc1234567",
      dates: ["2026-10-20"],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toBe(
      "Date 2026-10-20 is outside the poll window 2026-10-12 to 2026-10-12.",
    );
  });

  it("explains an all-past window", async () => {
    vi.setSystemTime(new Date("2026-10-12T04:00:00.000Z"));
    const getPollFn = vi.fn().mockResolvedValue({
      poll: mockPoll,
      participants: mockParticipants,
      heatmap: {},
    });
    const ctx = makeSuggestCtx(getPollFn);

    const result = await suggestMeetingTimesTool.run(ctx, {
      slug: "abc1234567",
    });
    expect(result.isError).toBeFalsy();
    const rawText =
      result.content.find((c) => c.type === "text")?.text ?? "{}";
    const parsed = JSON.parse(rawText) as {
      options: unknown[];
      message: string;
    };
    expect(parsed.options).toEqual([]);
    expect(parsed.message).toBe(
      "Every matching time is already in the past. Pass includePast: true to see past times.",
    );
  });

  it("explains when nobody can attend", async () => {
    const emptyParticipants = mockParticipants.map((p) => ({
      ...p,
      availableSlots: [],
      ifNeededSlots: [],
    }));
    const getPollFn = vi.fn().mockResolvedValue({
      poll: mockPoll,
      participants: emptyParticipants,
      heatmap: {},
    });
    const ctx = makeSuggestCtx(getPollFn);

    const result = await suggestMeetingTimesTool.run(ctx, {
      slug: "abc1234567",
    });
    expect(result.isError).toBeFalsy();
    const rawText =
      result.content.find((c) => c.type === "text")?.text ?? "{}";
    const parsed = JSON.parse(rawText) as {
      nobodyCanAttend: boolean;
      message: string;
    };
    expect(parsed.nobodyCanAttend).toBe(true);
    expect(parsed.message).toBe(
      "Nobody has marked any time in this window as available or if needed; these are the earliest open times.",
    );
  });

  it("explains an unmet requireParticipants", async () => {
    const getPollFn = vi.fn().mockResolvedValue({
      poll: mockPoll,
      participants: mockParticipants,
      heatmap: {},
    });
    const ctx = makeSuggestCtx(getPollFn);

    const result = await suggestMeetingTimesTool.run(ctx, {
      slug: "abc1234567",
      requireParticipants: ["Alice Tan", "Ben Lim", "Student"],
    });
    expect(result.isError).toBeFalsy();
    const rawText =
      result.content.find((c) => c.type === "text")?.text ?? "{}";
    const parsed = JSON.parse(rawText) as {
      options: unknown[];
      message: string;
    };
    expect(parsed.options.length).toBeGreaterThan(0);
    expect(parsed.message).toBe(
      "No time in this window works for all of: Alice Tan, Ben Lim, Student. These are the closest options; see each option's unavailable list.",
    );
  });

  it("returns errText when the poll is missing", async () => {
    const getPollFn = vi
      .fn()
      .mockRejectedValue(new Error("Meeting poll not found"));
    const ctx = makeSuggestCtx(getPollFn);

    const result = await suggestMeetingTimesTool.run(ctx, {
      slug: "abc1234567",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("Meeting poll not found");
  });
});

