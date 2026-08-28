import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { getMyRoadmapTool, getPublicRoadmapTool } from "./roadmap-detail";

const fakeUser: SessionUser = {
  id: "u1",
  email: "a@smu.edu.sg",
  username: "u1",
  isVerified: true,
  universityId: 1,
  firstName: null,
  lastName: null,
  telegramId: null,
  photoUrl: null,
  facultyId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Each tool calls a procedure on a specific sub-router (e.g. caller.roadmaps.getMine),
// so place each mock under the router namespace the tool actually uses. Every sub-router
// gets a DISTINCT key so a tool calling the wrong router cannot accidentally hit a mock
// that happens to be present under the same property name elsewhere.
function makeCaller(procs: Record<string, unknown>) {
  return {
    roadmaps: { getMine: procs.roadmapsGetMine, getById: procs.roadmapsGetById },
  } as unknown as ToolContext["caller"];
}

describe("get-my-roadmap", () => {
  it("returns the roadmap with entries via caller.roadmaps.getMine", async () => {
    const fn = vi.fn().mockResolvedValue({
      roadmap: { id: "r1", name: "My Plan", matricTermId: "t1" },
      entries: [
        {
          id: "e1",
          courseId: "c1",
          yearNumber: 1,
          term: "T1",
          course: { code: "COR-STAT1202", name: "Stats", creditUnits: 1 },
        },
      ],
    });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ roadmapsGetMine: fn }) };
    const res = await getMyRoadmapTool.run(ctx, { roadmapId: "r1" });
    expect(res.isError).toBeFalsy();
    expect(JSON.parse(res.content[0]!.text)).toMatchObject({
      roadmap: { id: "r1" },
      entries: [{ course: { code: "COR-STAT1202" } }],
    });
    expect(fn).toHaveBeenCalledWith({ roadmapId: "r1" });
  });

  it("returns errText when the procedure throws", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("forbidden"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ roadmapsGetMine: fn }) };
    const res = await getMyRoadmapTool.run(ctx, { roadmapId: "r1" });
    expect(res.isError).toBe(true);
  });
});

describe("get-public-roadmap", () => {
  it("returns a public roadmap's entries via caller.roadmaps.getById", async () => {
    const fn = vi.fn().mockResolvedValue({
      id: "r9",
      name: "Senior CS",
      user: { username: "senior" },
      entries: [
        {
          id: "e1",
          yearNumber: 2,
          term: "T1",
          course: { code: "CS201", name: "Data Structures", creditUnits: 1 },
        },
      ],
    });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ roadmapsGetById: fn }) };
    const res = await getPublicRoadmapTool.run(ctx, { roadmapId: "r9" });
    expect(res.isError).toBeFalsy();
    expect(fn).toHaveBeenCalledWith({ id: "r9" });
    expect(JSON.parse(res.content[0]!.text)).toMatchObject({
      id: "r9",
      entries: [{ course: { code: "CS201" } }],
    });
  });

  it("returns errText when the roadmap is not found", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("NOT_FOUND"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ roadmapsGetById: fn }) };
    const res = await getPublicRoadmapTool.run(ctx, { roadmapId: "nope" });
    expect(res.isError).toBe(true);
  });
});
