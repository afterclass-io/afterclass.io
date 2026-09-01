import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import {
  addClassToTimetableTool,
  createTimetableTool,
  removeClassFromTimetableTool,
  removeTimetableTool,
  renameTimetableTool,
  setTimetableVisibilityTool,
} from "./timetable";

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

// Each tool calls a procedure on a specific sub-router (timetable.* or sharing.setVisibility),
// so place each mock under the router namespace the tool actually uses, with distinct key names.
function makeCaller(procs: Record<string, unknown>) {
  return {
    timetable: {
      create: procs.timetableCreate,
      rename: procs.timetableRename,
      remove: procs.timetableRemove,
      addSlot: procs.timetableAddSlot,
      removeSlot: procs.timetableRemoveSlot,
    },
    sharing: { setVisibility: procs.sharingSetVisibility },
    acadTerms: { current: procs.acadTermsGetCurrent },
  } as unknown as ToolContext["caller"];
}

describe("timetable write tools", () => {
  it("create-timetable calls timetable.create", async () => {
    const fn = vi.fn().mockResolvedValue({ id: "tt1" });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ timetableCreate: fn }) };
    await createTimetableTool.run(ctx, { acadTermId: "t1", name: "Plan A" });
    expect(fn).toHaveBeenCalledWith({ acadTermId: "t1", name: "Plan A" });
  });

  it("create-timetable returns errText when timetable.create rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ timetableCreate: fn }) };
    const result = await createTimetableTool.run(ctx, { acadTermId: "t1", name: "Plan A" });
    expect(result.isError).toBe(true);
  });

  it("create-timetable defaults acadTermId to the current term when omitted", async () => {
    const fn = vi.fn().mockResolvedValue({ id: "tt1" });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        timetableCreate: fn,
        acadTermsGetCurrent: vi.fn().mockResolvedValue({ id: "t1" }),
      }),
    };
    await createTimetableTool.run(ctx, { name: "Plan A" });
    expect(fn).toHaveBeenCalledWith({ acadTermId: "t1", name: "Plan A" });
  });

  it("create-timetable returns a friendly error when acadTermId is omitted and there is no current term", async () => {
    const fn = vi.fn();
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        timetableCreate: fn,
        acadTermsGetCurrent: vi.fn().mockResolvedValue(null),
      }),
    };
    const result = await createTimetableTool.run(ctx, { name: "Plan A" });
    expect(result.isError).toBe(true);
    expect(fn).not.toHaveBeenCalled();
  });

  it("add-class-to-timetable calls timetable.addSlot", async () => {
    const fn = vi.fn().mockResolvedValue({});
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ timetableAddSlot: fn }) };
    await addClassToTimetableTool.run(ctx, { timetableId: "tt1", classId: "cl1" });
    expect(fn).toHaveBeenCalledWith({ timetableId: "tt1", classId: "cl1" });
  });

  it("add-class-to-timetable returns errText when timetable.addSlot rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ timetableAddSlot: fn }) };
    const result = await addClassToTimetableTool.run(ctx, { timetableId: "tt1", classId: "cl1" });
    expect(result.isError).toBe(true);
  });

  it("remove-class-from-timetable calls timetable.removeSlot", async () => {
    const fn = vi.fn().mockResolvedValue({});
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ timetableRemoveSlot: fn }) };
    await removeClassFromTimetableTool.run(ctx, { timetableId: "tt1", classId: "cl1" });
    expect(fn).toHaveBeenCalledWith({ timetableId: "tt1", classId: "cl1" });
  });

  it("remove-class-from-timetable returns errText when timetable.removeSlot rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ timetableRemoveSlot: fn }) };
    const result = await removeClassFromTimetableTool.run(ctx, { timetableId: "tt1", classId: "cl1" });
    expect(result.isError).toBe(true);
  });

  it("rename-timetable calls timetable.rename", async () => {
    const fn = vi.fn().mockResolvedValue({});
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ timetableRename: fn }) };
    await renameTimetableTool.run(ctx, { timetableId: "tt1", name: "New" });
    expect(fn).toHaveBeenCalledWith({ timetableId: "tt1", name: "New" });
  });

  it("rename-timetable returns errText when timetable.rename rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ timetableRename: fn }) };
    const result = await renameTimetableTool.run(ctx, { timetableId: "tt1", name: "New" });
    expect(result.isError).toBe(true);
  });

  it("remove-timetable calls timetable.remove", async () => {
    const fn = vi.fn().mockResolvedValue({});
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ timetableRemove: fn }) };
    await removeTimetableTool.run(ctx, { timetableId: "tt1" });
    expect(fn).toHaveBeenCalledWith({ timetableId: "tt1" });
  });

  it("remove-timetable returns errText when timetable.remove rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ timetableRemove: fn }) };
    const result = await removeTimetableTool.run(ctx, { timetableId: "tt1" });
    expect(result.isError).toBe(true);
  });

  it("set-timetable-visibility calls sharing.setVisibility with entity=timetable", async () => {
    const fn = vi.fn().mockResolvedValue({});
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ sharingSetVisibility: fn }) };
    await setTimetableVisibilityTool.run(ctx, { timetableId: "tt1", visibility: "UNLISTED" });
    expect(fn).toHaveBeenCalledWith({ entity: "timetable", id: "tt1", visibility: "UNLISTED" });
  });

  it("set-timetable-visibility returns errText when sharing.setVisibility rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ sharingSetVisibility: fn }) };
    const result = await setTimetableVisibilityTool.run(ctx, { timetableId: "tt1", visibility: "UNLISTED" });
    expect(result.isError).toBe(true);
  });

  it("set-timetable-visibility strips shareToken bearer token from the output", async () => {
    const fn = vi.fn().mockResolvedValue({ visibility: "UNLISTED", shareToken: "secret-tok" });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ sharingSetVisibility: fn }) };
    const result = await setTimetableVisibilityTool.run(ctx, { timetableId: "tt1", visibility: "UNLISTED" });
    const parsed = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(parsed.shareToken).toBeUndefined();
    expect(parsed.visibility).toBe("UNLISTED");
  });
});
