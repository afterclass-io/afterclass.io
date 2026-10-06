import { describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/server/auth/config";
import type { ToolContext } from "../../types";
import {
  createMeetingPollTool,
  submitMeetingAvailabilityTool,
} from "./meetings";

vi.mock("@/server/db", () => ({
  db: {
    courses: {
      findFirst: vi.fn(),
    },
  },
}));

import { db } from "@/server/db";

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

function makeCtx(procs: {
  createPoll?: ReturnType<typeof vi.fn>;
  submitAvailability?: ReturnType<typeof vi.fn>;
  getPollBySlug?: ReturnType<typeof vi.fn>;
}): ToolContext {
  return {
    user: fakeUser,
    caller: {
      meetings: {
        createPoll: procs.createPoll ?? vi.fn(),
        submitAvailability: procs.submitAvailability ?? vi.fn(),
        getPollBySlug: procs.getPollBySlug ?? vi.fn(),
      },
    } as unknown as ToolContext["caller"],
  };
}

describe("createMeetingPollTool", () => {
  it("creates a poll and returns slug and URL", async () => {
    const createFn = vi.fn().mockResolvedValue({
      id: "p1",
      slug: "newpoll123",
    });
    const ctx = makeCtx({ createPoll: createFn });

    const result = await createMeetingPollTool.run(ctx, {
      title: "Team Project Sync",
      startDate: "2026-10-12",
      endDate: "2026-10-16",
    });

    expect(createFn).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Team Project Sync",
        startDate: "2026-10-12",
        endDate: "2026-10-16",
        startHour: 8,
        endHour: 22,
      }),
    );

    const text = result.content.find((c) => c.type === "text")?.text ?? "{}";
    const parsed = JSON.parse(text) as { slug: string; url: string };
    expect(parsed.slug).toBe("newpoll123");
    expect(parsed.url).toBe("/meetings/newpoll123");
  });

  it("resolves courseCode to courseId if provided", async () => {
    const findCourseMock = vi.spyOn(db.courses, "findFirst");
    findCourseMock.mockResolvedValueOnce({ id: "course-uuid" } as never);

    const createFn = vi.fn().mockResolvedValue({
      id: "p2",
      slug: "is215poll",
    });
    const ctx = makeCtx({ createPoll: createFn });

    const result = await createMeetingPollTool.run(ctx, {
      title: "IS215 Sprint Planning",
      startDate: "2026-10-12",
      endDate: "2026-10-14",
      courseCode: "IS215",
      section: "G1",
    });

    expect(findCourseMock).toHaveBeenCalledWith({
      where: { code: { equals: "IS215", mode: "insensitive" } },
      select: { id: true },
    });

    expect(createFn).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: "course-uuid",
        section: "G1",
      }),
    );

    const text = result.content.find((c) => c.type === "text")?.text ?? "{}";
    const parsed = JSON.parse(text) as { slug: string };
    expect(parsed.slug).toBe("is215poll");
  });

  it("returns an error and does not create a poll when the course code is unknown", async () => {
    vi.spyOn(db.courses, "findFirst").mockResolvedValueOnce(null);
    const createFn = vi.fn();
    const ctx = makeCtx({ createPoll: createFn });

    const result = await createMeetingPollTool.run(ctx, {
      title: "Unknown Course Poll",
      startDate: "2026-10-12",
      endDate: "2026-10-14",
      courseCode: "ZZ999",
      section: "G1",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("ZZ999");
    expect(createFn).not.toHaveBeenCalled();
  });

  it("returns error text on failure", async () => {
    const createFn = vi.fn().mockRejectedValue(new Error("Rate limit exceeded"));
    const ctx = makeCtx({ createPoll: createFn });

    const result = await createMeetingPollTool.run(ctx, {
      title: "Fail Poll",
      startDate: "2026-10-12",
      endDate: "2026-10-14",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("Rate limit exceeded");
  });
});

describe("submitMeetingAvailabilityTool", () => {
  const mockPoll = {
    id: "p1",
    slug: "newpoll123",
    title: "Team Sync",
    startDate: new Date("2026-10-12T00:00:00.000Z"),
    endDate: new Date("2026-10-13T00:00:00.000Z"),
    startHour: 8,
    endHour: 22,
    slotDurationMinutes: 15,
    course: null,
    section: null,
    teamIdentifier: null,
    acadTerm: null,
  };

  const defaultParticipants = [
    {
      participantId: "part-1",
      name: "Alice Tan",
      availableSlots: [0, 1, 2, 3],
      ifNeededSlots: [64],
      isCurrentUser: true,
    },
    {
      participantId: "part-2",
      name: "Bob Lee",
      availableSlots: [10],
      ifNeededSlots: [],
      isCurrentUser: false,
    },
  ];

  it("replace converts ranges to slot indices", async () => {
    const getPollFn = vi.fn().mockResolvedValue({
      poll: mockPoll,
      participants: defaultParticipants,
      heatmap: {},
    });
    const submitFn = vi.fn().mockResolvedValue({
      participantId: "part-1",
      success: true,
    });
    const ctx = makeCtx({
      getPollBySlug: getPollFn,
      submitAvailability: submitFn,
    });

    const result = await submitMeetingAvailabilityTool.run(ctx, {
      slug: "newpoll123",
      availability: [
        { date: "2026-10-13", start: "10:00", end: "11:00" },
        { date: "2026-10-13", start: "11:00", end: "11:30", status: "ifNeeded" },
      ],
    });

    expect(submitFn).toHaveBeenCalledWith({
      slug: "newpoll123",
      availableSlots: [64, 65, 66, 67],
      ifNeededSlots: [68, 69],
    });

    const rawText =
      result.content.find((c) => c.type === "text")?.text ?? "{}";
    expect(rawText).not.toContain("Slots");
    expect(rawText).not.toContain("participantId");

    const parsed = JSON.parse(rawText) as {
      success: boolean;
      slug: string;
      mode: string;
      availability: Array<{
        date: string;
        start: string;
        end: string;
        status: string;
      }>;
      url: string;
      message: string;
    };
    expect(parsed.mode).toBe("replace");
    expect(parsed.availability).toEqual([
      { date: "2026-10-13", start: "10:00", end: "11:00", status: "available" },
      { date: "2026-10-13", start: "11:00", end: "11:30", status: "ifNeeded" },
    ]);
    expect(parsed.url).toBe("/meetings/newpoll123");
    expect(parsed.message).toBe(
      "Availability saved for /meetings/newpoll123 (replace, 2 ranges).",
    );
  });

  it("merge unions with the caller's existing slots and new status wins", async () => {
    const getPollFn = vi.fn().mockResolvedValue({
      poll: mockPoll,
      participants: defaultParticipants,
      heatmap: {},
    });
    const submitFn = vi.fn().mockResolvedValue({
      participantId: "part-1",
      success: true,
    });
    const ctx = makeCtx({
      getPollBySlug: getPollFn,
      submitAvailability: submitFn,
    });

    const result = await submitMeetingAvailabilityTool.run(ctx, {
      slug: "newpoll123",
      mode: "merge",
      availability: [{ date: "2026-10-13", start: "10:00", end: "10:30" }],
    });

    expect(result.isError).toBeFalsy();
    expect(submitFn).toHaveBeenCalledWith({
      slug: "newpoll123",
      availableSlots: [0, 1, 2, 3, 64, 65],
      ifNeededSlots: [],
    });
  });

  it("merge with unavailable removes those times", async () => {
    const getPollFn = vi.fn().mockResolvedValue({
      poll: mockPoll,
      participants: defaultParticipants,
      heatmap: {},
    });
    const submitFn = vi.fn().mockResolvedValue({
      participantId: "part-1",
      success: true,
    });
    const ctx = makeCtx({
      getPollBySlug: getPollFn,
      submitAvailability: submitFn,
    });

    const result = await submitMeetingAvailabilityTool.run(ctx, {
      slug: "newpoll123",
      mode: "merge",
      availability: [
        { date: "2026-10-12", start: "08:15", end: "08:45", status: "unavailable" },
        { date: "2026-10-13", start: "10:00", end: "10:15", status: "unavailable" },
      ],
    });

    expect(result.isError).toBeFalsy();
    expect(submitFn).toHaveBeenCalledWith({
      slug: "newpoll123",
      availableSlots: [0, 3],
      ifNeededSlots: [],
    });
  });

  it("merge without an existing response behaves like replace", async () => {
    const getPollFn = vi.fn().mockResolvedValue({
      poll: mockPoll,
      participants: [
        {
          participantId: "part-2",
          name: "Bob Lee",
          availableSlots: [10],
          ifNeededSlots: [],
          isCurrentUser: false,
        },
      ],
      heatmap: {},
    });
    const submitFn = vi.fn().mockResolvedValue({
      participantId: "part-1",
      success: true,
    });
    const ctx = makeCtx({
      getPollBySlug: getPollFn,
      submitAvailability: submitFn,
    });

    const result = await submitMeetingAvailabilityTool.run(ctx, {
      slug: "newpoll123",
      mode: "merge",
      availability: [{ date: "2026-10-13", start: "10:00", end: "10:30" }],
    });

    expect(result.isError).toBeFalsy();
    expect(submitFn).toHaveBeenCalledWith({
      slug: "newpoll123",
      availableSlots: [64, 65],
      ifNeededSlots: [],
    });
  });

  it("replace with an empty list clears availability", async () => {
    const getPollFn = vi.fn().mockResolvedValue({
      poll: mockPoll,
      participants: defaultParticipants,
      heatmap: {},
    });
    const submitFn = vi.fn().mockResolvedValue({
      participantId: "part-1",
      success: true,
    });
    const ctx = makeCtx({
      getPollBySlug: getPollFn,
      submitAvailability: submitFn,
    });

    const result = await submitMeetingAvailabilityTool.run(ctx, {
      slug: "newpoll123",
      availability: [],
    });

    expect(result.isError).toBeFalsy();
    expect(submitFn).toHaveBeenCalledWith({
      slug: "newpoll123",
      availableSlots: [],
      ifNeededSlots: [],
    });
  });

  it.each([
    {
      name: "off-grid time",
      input: {
        slug: "newpoll123",
        availability: [
          { date: "2026-10-13", start: "10:10", end: "11:00" },
        ],
      },
      expectedError: "Time 10:10 on 2026-10-13 is not on a 15-minute boundary.",
    },
    {
      name: "date outside poll window",
      input: {
        slug: "newpoll123",
        availability: [
          { date: "2026-10-14", start: "10:00", end: "11:00" },
        ],
      },
      expectedError:
        "Date 2026-10-14 is outside the poll window 2026-10-12 to 2026-10-13.",
    },
    {
      name: "end before start",
      input: {
        slug: "newpoll123",
        availability: [
          { date: "2026-10-13", start: "11:00", end: "10:00" },
        ],
      },
      expectedError:
        "Range 11:00-10:00 on 2026-10-13 must end after it starts.",
    },
    {
      name: "outside poll hours",
      input: {
        slug: "newpoll123",
        availability: [
          { date: "2026-10-13", start: "07:00", end: "08:00" },
        ],
      },
      expectedError:
        "Time 07:00-08:00 on 2026-10-13 is outside the poll hours 08:00-22:00 SGT.",
    },
    {
      name: "conflicting statuses",
      input: {
        slug: "newpoll123",
        availability: [
          { date: "2026-10-13", start: "10:00", end: "11:00" },
          {
            date: "2026-10-13",
            start: "10:30",
            end: "11:30",
            status: "ifNeeded" as const,
          },
        ],
      },
      expectedError: "2026-10-13 10:30 is given conflicting statuses.",
    },
    {
      name: "unavailable status in replace mode",
      input: {
        slug: "newpoll123",
        mode: "replace" as const,
        availability: [
          {
            date: "2026-10-13",
            start: "10:00",
            end: "11:00",
            status: "unavailable" as const,
          },
        ],
      },
      expectedError:
        'status "unavailable" only applies with mode "merge"; in replace mode leave those times out.',
    },
  ])("rejects bad ranges without submitting ($name)", async ({ input, expectedError }) => {
    const getPollFn = vi.fn().mockResolvedValue({
      poll: mockPoll,
      participants: defaultParticipants,
      heatmap: {},
    });
    const submitFn = vi.fn();
    const ctx = makeCtx({
      getPollBySlug: getPollFn,
      submitAvailability: submitFn,
    });

    const result = await submitMeetingAvailabilityTool.run(ctx, input);

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(expectedError);
    expect(submitFn).not.toHaveBeenCalled();
  });

  it("returns error when the poll is missing", async () => {
    const getPollFn = vi
      .fn()
      .mockRejectedValue(new Error("Meeting poll not found"));
    const submitFn = vi.fn();
    const ctx = makeCtx({
      getPollBySlug: getPollFn,
      submitAvailability: submitFn,
    });

    const result = await submitMeetingAvailabilityTool.run(ctx, {
      slug: "missingpoll",
      availability: [{ date: "2026-10-13", start: "10:00", end: "11:00" }],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("Meeting poll not found");
    expect(submitFn).not.toHaveBeenCalled();
  });

  it("surfaces procedure errors", async () => {
    const getPollFn = vi.fn().mockResolvedValue({
      poll: mockPoll,
      participants: defaultParticipants,
      heatmap: {},
    });
    const submitFn = vi
      .fn()
      .mockRejectedValue(new Error("Rate limit exceeded"));
    const ctx = makeCtx({
      getPollBySlug: getPollFn,
      submitAvailability: submitFn,
    });

    const result = await submitMeetingAvailabilityTool.run(ctx, {
      slug: "newpoll123",
      availability: [{ date: "2026-10-13", start: "10:00", end: "11:00" }],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("Rate limit exceeded");
  });
});
