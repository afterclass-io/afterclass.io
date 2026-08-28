import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import {
  createRoadmapTool,
  removeRoadmapTool,
  renameRoadmapTool,
  saveRoadmapEntriesTool,
  setRoadmapVisibilityTool,
} from "./roadmaps";

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

// Each tool calls a procedure on a specific sub-router (roadmaps.* or sharing.setVisibility),
// so place each mock under the router namespace the tool actually uses, with distinct key names.
function makeCaller(procs: Record<string, unknown>) {
  return {
    roadmaps: {
      create: procs.roadmapsCreate,
      rename: procs.roadmapsRename,
      remove: procs.roadmapsRemove,
      saveEntries: procs.roadmapsSaveEntries,
    },
    sharing: { setVisibility: procs.sharingSetVisibility },
  } as unknown as ToolContext["caller"];
}

const entries = [{ courseId: "c1", yearNumber: 1, term: "T1" as const, sortOrder: 0 }];

describe("roadmap write tools", () => {
  it("create-roadmap calls roadmaps.create with name", async () => {
    const fn = vi.fn().mockResolvedValue({ id: "r1" });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ roadmapsCreate: fn }) };
    await createRoadmapTool.run(ctx, { name: "My Plan" });
    expect(fn).toHaveBeenCalledWith({ name: "My Plan" });
  });

  it("create-roadmap returns errText when roadmaps.create rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ roadmapsCreate: fn }) };
    const result = await createRoadmapTool.run(ctx, { name: "My Plan" });
    expect(result.isError).toBe(true);
  });

  it("rename-roadmap calls roadmaps.rename", async () => {
    const fn = vi.fn().mockResolvedValue({});
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ roadmapsRename: fn }) };
    await renameRoadmapTool.run(ctx, { roadmapId: "r1", name: "New", description: "d" });
    expect(fn).toHaveBeenCalledWith({ roadmapId: "r1", name: "New", description: "d" });
  });

  it("rename-roadmap returns errText when roadmaps.rename rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ roadmapsRename: fn }) };
    const result = await renameRoadmapTool.run(ctx, { roadmapId: "r1", name: "New", description: "d" });
    expect(result.isError).toBe(true);
  });

  it("remove-roadmap calls roadmaps.remove", async () => {
    const fn = vi.fn().mockResolvedValue({});
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ roadmapsRemove: fn }) };
    await removeRoadmapTool.run(ctx, { roadmapId: "r1" });
    expect(fn).toHaveBeenCalledWith({ roadmapId: "r1" });
  });

  it("remove-roadmap returns errText when roadmaps.remove rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ roadmapsRemove: fn }) };
    const result = await removeRoadmapTool.run(ctx, { roadmapId: "r1" });
    expect(result.isError).toBe(true);
  });

  it("save-roadmap-entries calls roadmaps.saveEntries with the entries array", async () => {
    const fn = vi.fn().mockResolvedValue({});
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ roadmapsSaveEntries: fn }) };
    await saveRoadmapEntriesTool.run(ctx, { roadmapId: "r1", entries });
    expect(fn).toHaveBeenCalledWith({ roadmapId: "r1", entries });
  });

  it("save-roadmap-entries returns errText when roadmaps.saveEntries rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ roadmapsSaveEntries: fn }) };
    const result = await saveRoadmapEntriesTool.run(ctx, { roadmapId: "r1", entries });
    expect(result.isError).toBe(true);
  });

  it("set-roadmap-visibility calls sharing.setVisibility with entity=roadmap", async () => {
    const fn = vi.fn().mockResolvedValue({});
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ sharingSetVisibility: fn }) };
    await setRoadmapVisibilityTool.run(ctx, { roadmapId: "r1", visibility: "PUBLIC" });
    expect(fn).toHaveBeenCalledWith({ entity: "roadmap", id: "r1", visibility: "PUBLIC" });
  });

  it("set-roadmap-visibility returns errText when sharing.setVisibility rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ sharingSetVisibility: fn }) };
    const result = await setRoadmapVisibilityTool.run(ctx, { roadmapId: "r1", visibility: "PUBLIC" });
    expect(result.isError).toBe(true);
  });
});
