import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/assistant/ratelimit", () => ({
  checkAndIncrement: vi.fn(),
}));

vi.mock("@/common/tools/acad-term", () => ({
  getCurrentAcadTerm: vi.fn(),
}));

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { meetingsRouter } from "./router";

const CREATOR_ID = "00000000-0000-4000-a000-000000000001";
const OTHER_USER_ID = "00000000-0000-4000-a000-000000000002";

const pollRow = {
  id: "poll-uuid-1",
  slug: "abcdefghij",
  title: "Sprint",
  description: null,
  agenda: null,
  links: [],
  creatorId: CREATOR_ID,
  startDate: new Date("2026-10-10T00:00:00.000Z"),
  endDate: new Date("2026-10-15T00:00:00.000Z"),
  startHour: 9,
  endHour: 18,
  slotDurationMinutes: 15,
  course: null,
  section: null,
  teamIdentifier: "Team Shit",
  acadTerm: null,
  createdAt: new Date("2026-10-01"),
  updatedAt: new Date("2026-10-01"),
  _count: { participants: 0 },
  participants: [],
};

describe("team identifier masking", () => {
  it("getPollBySlug masks it for a non-creator and keeps it raw for the creator", async () => {
    const findUnique = vi.fn().mockResolvedValue(pollRow);

    const asOther = makeCaller(
      meetingsRouter.createCaller,
      { meetingPoll: { findUnique } },
      { user: { id: OTHER_USER_ID } },
    );
    const asCreator = makeCaller(
      meetingsRouter.createCaller,
      { meetingPoll: { findUnique } },
      { user: { id: CREATOR_ID } },
    );

    expect(
      (await asOther.getPollBySlug({ slug: "abcdefghij" })).poll.teamIdentifier,
    ).toBe("Team ****");
    expect(
      (await asCreator.getPollBySlug({ slug: "abcdefghij" })).poll
        .teamIdentifier,
    ).toBe("Team Shit");
  });

  it("listMyMeetings masks it on polls created by others only", async () => {
    const caller = makeCaller(
      meetingsRouter.createCaller,
      {
        meetingPoll: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              pollRow,
              { ...pollRow, creatorId: OTHER_USER_ID },
              { ...pollRow, creatorId: OTHER_USER_ID, teamIdentifier: null },
            ]),
        },
      },
      { user: { id: CREATOR_ID } },
    );

    const result = await caller.listMyMeetings();

    expect(result[0]?.teamIdentifier).toBe("Team Shit");
    expect(result[1]?.teamIdentifier).toBe("Team ****");
    expect(result[2]?.teamIdentifier).toBeNull();
  });
});
