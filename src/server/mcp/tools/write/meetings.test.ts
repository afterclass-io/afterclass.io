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
}): ToolContext {
  return {
    user: fakeUser,
    caller: {
      meetings: {
        createPoll: procs.createPoll ?? vi.fn(),
        submitAvailability: procs.submitAvailability ?? vi.fn(),
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
  it("submits availability slots and returns participant confirmation", async () => {
    const submitFn = vi.fn().mockResolvedValue({
      participantId: "part-1",
      success: true,
    });
    const ctx = makeCtx({ submitAvailability: submitFn });

    const result = await submitMeetingAvailabilityTool.run(ctx, {
      slug: "newpoll123",
      availableSlots: [0, 1, 2, 3],
      ifNeededSlots: [4],
    });

    expect(submitFn).toHaveBeenCalledWith({
      slug: "newpoll123",
      availableSlots: [0, 1, 2, 3],
      ifNeededSlots: [4],
    });

    const text = result.content.find((c) => c.type === "text")?.text ?? "{}";
    const parsed = JSON.parse(text) as {
      success: boolean;
      availableSlotCount: number;
      ifNeededSlotCount: number;
      url: string;
    };
    expect(parsed.success).toBe(true);
    expect(parsed.availableSlotCount).toBe(4);
    expect(parsed.ifNeededSlotCount).toBe(1);
    expect(parsed.url).toBe("/meetings/newpoll123");
  });

  it("returns error when the poll is missing", async () => {
    const submitFn = vi
      .fn()
      .mockRejectedValue(new Error("Meeting poll not found"));
    const ctx = makeCtx({ submitAvailability: submitFn });

    const result = await submitMeetingAvailabilityTool.run(ctx, {
      slug: "missingpoll",
      availableSlots: [1, 2],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("Meeting poll not found");
  });
});
