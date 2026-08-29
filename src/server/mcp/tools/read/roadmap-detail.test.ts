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

  it("strips shareToken bearer token from the roadmap", async () => {
    const fn = vi.fn().mockResolvedValue({
      roadmap: { id: "r1", name: "My Plan", shareToken: "secret-tok" },
      entries: [],
    });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ roadmapsGetMine: fn }) };
    const res = await getMyRoadmapTool.run(ctx, { roadmapId: "r1" });
    const parsed = JSON.parse(res.content[0]!.text) as { roadmap: Record<string, unknown> };
    expect(parsed.roadmap.shareToken).toBeUndefined();
    expect(parsed.roadmap.id).toBe("r1");
  });

  it("exposes a roadmap-view widget whose props normalize the { roadmap, entries } output", async () => {
    // Shape mirrors caller.roadmaps.getMine: entries carry a nested `course`
    // with { code, name, creditUnits, description }.
    const fn = vi.fn().mockResolvedValue({
      roadmap: { id: "r1", name: "My Plan", matricTermId: "t1" },
      entries: [
        {
          id: "e1",
          courseId: "c1",
          yearNumber: 1,
          term: "T1",
          course: {
            code: "COR-STAT1202",
            name: "Stats",
            creditUnits: 1,
            description: "desc",
          },
        },
      ],
    });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ roadmapsGetMine: fn }) };
    const res = await getMyRoadmapTool.run(ctx, { roadmapId: "r1" });
    expect(getMyRoadmapTool.widgetName).toBe("roadmap-view");
    const props = getMyRoadmapTool.toWidgetProps?.(res);
    expect(props).toEqual({
      roadmapId: "r1",
      name: "My Plan",
      isPublic: false,
      owner: null,
      voteCount: null,
      entries: [
        {
          yearNumber: 1,
          term: "T1",
          courseCode: "COR-STAT1202",
          courseName: "Stats",
          creditUnits: 1,
        },
      ],
    });
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

  it("exposes a roadmap-view widget whose props normalize owner + voteCount", async () => {
    // Shape mirrors caller.roadmaps.getById: { roadmap, entries, ownerUsername,
    // ownerFaculty, voteCount, viewerHasVoted }; entries nest `course`.
    const fn = vi.fn().mockResolvedValue({
      roadmap: {
        id: "r9",
        name: "Senior CS",
        user: { username: "senior123" },
      },
      entries: [
        {
          id: "e1",
          courseId: "c9",
          yearNumber: 2,
          term: "T1",
          sortOrder: 0,
          course: {
            code: "CS201",
            name: "Data Structures",
            creditUnits: 1,
            description: "desc",
          },
        },
      ],
      ownerUsername: "senior123",
      ownerFaculty: { name: "School of Computing", acronym: "SCIS" },
      voteCount: 42,
      viewerHasVoted: false,
    });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ roadmapsGetById: fn }) };
    const res = await getPublicRoadmapTool.run(ctx, { roadmapId: "r9" });
    expect(getPublicRoadmapTool.widgetName).toBe("roadmap-view");
    const props = getPublicRoadmapTool.toWidgetProps?.(res);
    expect(props).toEqual({
      roadmapId: "r9",
      name: "Senior CS",
      isPublic: true,
      owner: "senior123",
      voteCount: 42,
      entries: [
        {
          yearNumber: 2,
          term: "T1",
          courseCode: "CS201",
          courseName: "Data Structures",
          creditUnits: 1,
        },
      ],
    });
  });
});
