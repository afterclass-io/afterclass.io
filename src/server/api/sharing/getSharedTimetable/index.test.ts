import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { getSharedTimetable } from "./index";

const router = createTRPCRouter({ getSharedTimetable });

const slotFixture = {
  class: {
    id: "cls1",
    section: "G1",
    course: { code: "IS101", name: "Intro", creditUnits: 1 },
    professor: { name: "Prof X" },
    classTimings: [
      { dayOfWeek: "MON", startTime: "08:15", endTime: "11:30", venue: "SR 2-1" },
    ],
    classExamTimings: [],
  },
};

const timetableFixture = {
  id: "t1",
  name: "My Timetable",
  shareToken: "tok_valid",
  user: { username: "alice" },
  slots: [slotFixture],
};

describe("sharing.getSharedTimetable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the name, owner username and slots mapped to ArrangedClass for a valid token", async () => {
    const findUnique = vi.fn().mockResolvedValue(timetableFixture);
    const caller = makeCaller(router.createCaller, {
      userTimetable: { findUnique },
    });

    const result = await caller.getSharedTimetable({ token: "tok_valid" });

    expect(result.timetable).toEqual({
      name: "My Timetable",
      ownerUsername: "alice",
    });
    expect(result.slots).toEqual([
      {
        classId: "cls1",
        courseCode: "IS101",
        courseName: "Intro",
        section: "G1",
        professorName: "Prof X",
        creditUnits: 1,
        timings: [
          {
            dayOfWeek: "MON",
            startTime: "08:15",
            endTime: "11:30",
            venue: "SR 2-1",
          },
        ],
        examTimings: [],
      },
    ]);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { shareToken: "tok_valid" } }),
    );
  });

  it("throws NOT_FOUND for an unknown or revoked token", async () => {
    // Timetables going PRIVATE have shareToken nulled by sharing.setVisibility,
    // so "wrong visibility" and a bogus token are the same branch here.
    const caller = makeCaller(router.createCaller, {
      userTimetable: { findUnique: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      caller.getSharedTimetable({ token: "nope" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
