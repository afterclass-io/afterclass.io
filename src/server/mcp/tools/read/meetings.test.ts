import { describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/server/auth/config";
import type { ToolContext } from "../../types";
import { getMyMeetingsTool, getMeetingPollDetailTool } from "./meetings";

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
  it("returns formatted meetings list limited by input limit", async () => {
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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const listFn = vi.fn().mockResolvedValue(mockMeetings);
    const ctx = makeCtx(listFn);

    const result = await getMyMeetingsTool.run(ctx, { limit: 1 });
    expect(listFn).toHaveBeenCalled();

    const text = result.content.find((c) => c.type === "text")?.text ?? "{}";
    const parsed = JSON.parse(text) as {
      total: number;
      meetings: Array<{ slug: string; url: string }>;
    };
    expect(parsed.total).toBe(2);
    expect(parsed.meetings).toHaveLength(1);
    expect(parsed.meetings[0]?.slug).toBe("slug-1");
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
  it("returns meeting poll detail with participants and url", async () => {
    const mockDetail = {
      poll: {
        id: "p1",
        slug: "meeting-101",
        title: "Sprint Retrospective",
        description: "Review sprint goals",
        agenda: "Action items",
        links: ["https://meet.google.com/xyz"],
        isCreator: true,
        startDate: new Date("2026-10-10"),
        endDate: new Date("2026-10-12"),
        startHour: 9,
        endHour: 17,
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
          availableSlots: [1, 2, 3],
          ifNeededSlots: [4],
          isCurrentUser: true,
        },
      ],
      heatmap: { 1: { availableCount: 1, ifNeededCount: 0 } },
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

    const result = await getMeetingPollDetailTool.run(ctx, { slug: "meeting-101" });
    expect(getPollFn).toHaveBeenCalledWith({ slug: "meeting-101" });
    expect(result.isError).toBeFalsy();

    const text = result.content.find((c) => c.type === "text")?.text ?? "{}";
    const parsed = JSON.parse(text) as {
      poll: { title: string };
      participantCount: number;
      url: string;
    };
    expect(parsed.poll.title).toBe("Sprint Retrospective");
    expect(parsed.participantCount).toBe(1);
    expect(parsed.url).toBe("/meetings/meeting-101");
  });
});

