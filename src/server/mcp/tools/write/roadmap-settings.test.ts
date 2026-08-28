import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import {
  copyPublicRoadmapTool,
  setActiveRoadmapTool,
  setMatricTermTool,
  syncRoadmapProgressTool,
} from "./roadmap-settings";

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

// Each tool calls a procedure on the roadmaps sub-router
// (setMatricTerm/setActive/syncProgress/copyPublic), so place each mock under
// the router namespace the tool actually uses, with distinct key names.
function makeCaller(procs: Record<string, unknown>) {
  return {
    roadmaps: {
      setMatricTerm: procs.roadmapsSetMatricTerm,
      setActive: procs.roadmapsSetActive,
      syncProgress: procs.roadmapsSyncProgress,
      copyPublic: procs.roadmapsCopyPublic,
    },
  } as unknown as ToolContext["caller"];
}

describe("roadmap-settings write tools", () => {
  it("set-matric-term calls roadmaps.setMatricTerm with roadmapId + matricTermId", async () => {
    const fn = vi.fn().mockResolvedValue({ id: "r1", matricTermId: "t1" });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ roadmapsSetMatricTerm: fn }),
    };
    await setMatricTermTool.run(ctx, { roadmapId: "r1", matricTermId: "t1" });
    expect(fn).toHaveBeenCalledWith({ roadmapId: "r1", matricTermId: "t1" });
  });

  it("set-matric-term returns errText when roadmaps.setMatricTerm rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ roadmapsSetMatricTerm: fn }),
    };
    const result = await setMatricTermTool.run(ctx, {
      roadmapId: "r1",
      matricTermId: "t1",
    });
    expect(result.isError).toBe(true);
  });

  it("set-matric-term accepts a null matricTermId to clear the declaration", () => {
    const parsed = setMatricTermTool.inputSchema.safeParse({
      roadmapId: "r1",
      matricTermId: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("set-active-roadmap calls roadmaps.setActive with the roadmapId", async () => {
    const fn = vi.fn().mockResolvedValue({ success: true });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ roadmapsSetActive: fn }),
    };
    await setActiveRoadmapTool.run(ctx, { roadmapId: "r1" });
    expect(fn).toHaveBeenCalledWith({ roadmapId: "r1" });
  });

  it("set-active-roadmap returns errText when roadmaps.setActive rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ roadmapsSetActive: fn }),
    };
    const result = await setActiveRoadmapTool.run(ctx, { roadmapId: "r1" });
    expect(result.isError).toBe(true);
  });

  it("sync-roadmap-progress calls roadmaps.syncProgress with the roadmapId", async () => {
    const fn = vi
      .fn()
      .mockResolvedValue({ synced: 2, courseIds: ["c1", "c2"] });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ roadmapsSyncProgress: fn }),
    };
    await syncRoadmapProgressTool.run(ctx, { roadmapId: "r1" });
    expect(fn).toHaveBeenCalledWith({ roadmapId: "r1" });
  });

  it("sync-roadmap-progress returns the synced summary", async () => {
    const fn = vi
      .fn()
      .mockResolvedValue({ synced: 2, courseIds: ["c1", "c2"] });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ roadmapsSyncProgress: fn }),
    };
    const result = await syncRoadmapProgressTool.run(ctx, { roadmapId: "r1" });
    expect(result.isError).toBeUndefined();
    const text = result.content[0]?.text ?? "";
    expect(text).toContain("c1");
  });

  it("sync-roadmap-progress returns errText when roadmaps.syncProgress rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ roadmapsSyncProgress: fn }),
    };
    const result = await syncRoadmapProgressTool.run(ctx, { roadmapId: "r1" });
    expect(result.isError).toBe(true);
  });

  it("copy-public-roadmap calls roadmaps.copyPublic with the roadmapId", async () => {
    const fn = vi.fn().mockResolvedValue({
      id: "r2",
      name: "Senior Plan (copy)",
      description: null,
      entries: [],
    });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ roadmapsCopyPublic: fn }),
    };
    await copyPublicRoadmapTool.run(ctx, { roadmapId: "r1" });
    expect(fn).toHaveBeenCalledWith({ roadmapId: "r1" });
  });

  it("copy-public-roadmap maps the created roadmap to { newRoadmapId, name }", async () => {
    const fn = vi.fn().mockResolvedValue({
      id: "r2",
      name: "Senior Plan (copy)",
      description: null,
      entries: [],
    });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ roadmapsCopyPublic: fn }),
    };
    const result = await copyPublicRoadmapTool.run(ctx, { roadmapId: "r1" });
    expect(result.isError).toBeUndefined();
    const text = result.content[0]?.text ?? "";
    expect(text).toContain('"newRoadmapId": "r2"');
    expect(text).toContain('"name": "Senior Plan (copy)"');
  });

  it("copy-public-roadmap returns errText when roadmaps.copyPublic rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ roadmapsCopyPublic: fn }),
    };
    const result = await copyPublicRoadmapTool.run(ctx, { roadmapId: "r1" });
    expect(result.isError).toBe(true);
  });
});
