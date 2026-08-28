import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type { ToolContext, ToolResult } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { getMyTimetableDetailTool } from "./timetable-detail";

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

const { userTimetableFindUnique } = vi.hoisted(() => ({
  userTimetableFindUnique: vi.fn() as Mock,
}));

vi.mock("@/server/db", () => ({
  db: {
    userTimetable: { findUnique: userTimetableFindUnique },
    // Keep other db namespaces harmless - timetable-detail.ts only uses
    // db.userTimetable.findUnique for the timetableId-only DB fallback path.
    faculties: { findUnique: vi.fn() },
    chatUsage: { findUnique: vi.fn() },
  },
}));

// The tool calls timetable.listMine (to resolve the active timetable) and
// timetable.getArrangement (for the full arrangement), so both go under the
// `timetable` sub-router with DISTINCT keys.
function makeCaller(procs: Record<string, unknown>) {
  return {
    timetable: {
      listMine: procs.timetableListMine,
      getArrangement: procs.timetableGetArrangement,
    },
  } as unknown as ToolContext["caller"];
}

function textOf(result: ToolResult): string {
  const text = result.content[0]?.text;
  if (!text) throw new Error("tool returned no text content");
  return text;
}

type ParsedDetail = {
  timetableId: string;
  name: string;
  isActive?: boolean;
  termId?: string;
  slots: Array<{
    classId: string;
    courseCode: string;
    courseName: string;
    section: string;
    day: string | null;
    startTime: string;
    endTime: string;
    venue: string | null;
    professor: string | null;
    creditUnits: number;
  }>;
};

// Mirrors the real `timetable.getArrangement` return: one slot per class, each
// with potentially multiple weekly `timings`.
const arrangement = {
  timetable: { id: "tt1", name: "My Timetable" },
  slots: [
    {
      classId: "c1",
      courseCode: "ACC101",
      courseName: "Financial Accounting",
      section: "G1",
      professorName: "Jane Doe",
      creditUnits: 4,
      timings: [
        { id: 1, dayOfWeek: "Mon", startTime: "10:00", endTime: "12:00", venue: "SOE/SR3-1" },
        { id: 2, dayOfWeek: "Wed", startTime: "10:00", endTime: "12:00", venue: "SOE/SR3-1" },
      ],
      examTimings: [],
    },
  ],
};

describe("get-my-timetable-detail read tool", () => {
  beforeEach(() => {
    userTimetableFindUnique.mockReset();
    // Default: DB fallback must not be hit for paths that resolve via
    // arrangement.timetable or listMine. If it is hit unexpectedly the test
    // will get errText instead of the expected result, failing clearly.
    userTimetableFindUnique.mockResolvedValue(null);
  });

  it("is registered read-only", () => {
    expect(getMyTimetableDetailTool.readOnly).toBe(true);
  });

  it("calls timetable.getArrangement with the given timetableId and maps to flat slots", async () => {
    const fn = vi.fn().mockResolvedValue(arrangement);
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ timetableGetArrangement: fn }),
    };
    const result = await getMyTimetableDetailTool.run(ctx, { timetableId: "tt1" });

    expect(fn).toHaveBeenCalledWith({ timetableId: "tt1" });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(textOf(result)) as ParsedDetail;
    expect(parsed.timetableId).toBe("tt1");
    expect(parsed.name).toBe("My Timetable");
    // Only timetableId was given - no listMine lookup, so the metadata is
    // unknown and must be OMITTED (not defaulted to isActive: false).
    expect(parsed.isActive).toBeUndefined();
    expect(parsed.termId).toBeUndefined();
    // One row per class timing (the class has two weekly meetings).
    expect(parsed.slots).toHaveLength(2);
    expect(parsed.slots[0]).toEqual({
      classId: "c1",
      courseCode: "ACC101",
      courseName: "Financial Accounting",
      section: "G1",
      day: "Mon",
      startTime: "10:00",
      endTime: "12:00",
      venue: "SOE/SR3-1",
      professor: "Jane Doe",
      creditUnits: 4,
    });
    expect(parsed.slots[1]!.day).toBe("Wed");
  });

  it("resolves the active timetable via listMine when only acadTermId is given", async () => {
    const listMine = vi.fn().mockResolvedValue([
      { id: "tt1", name: "Old", isActive: false, acadTermId: "t1" },
      { id: "tt2", name: "Current", isActive: true, acadTermId: "t1" },
    ]);
    const getArr = vi
      .fn()
      .mockResolvedValue({ timetable: { id: "tt2", name: "Current" }, slots: [] });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ timetableListMine: listMine, timetableGetArrangement: getArr }),
    };
    const result = await getMyTimetableDetailTool.run(ctx, { acadTermId: "t1" });

    expect(listMine).toHaveBeenCalledWith({ acadTermId: "t1" });
    expect(getArr).toHaveBeenCalledWith({ timetableId: "tt2" });
    const parsed = JSON.parse(textOf(result)) as ParsedDetail;
    expect(parsed.timetableId).toBe("tt2");
    expect(parsed.isActive).toBe(true);
    expect(parsed.termId).toBe("t1");
  });

  it("enriches isActive/termId via listMine when both timetableId and acadTermId are given (active match)", async () => {
    const listMine = vi.fn().mockResolvedValue([
      { id: "tt1", name: "Old", isActive: false, acadTermId: "t1" },
      { id: "tt2", name: "Current", isActive: true, acadTermId: "t1" },
    ]);
    const getArr = vi
      .fn()
      .mockResolvedValue({ timetable: { id: "tt2", name: "Current" }, slots: [] });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ timetableListMine: listMine, timetableGetArrangement: getArr }),
    };
    const result = await getMyTimetableDetailTool.run(ctx, { timetableId: "tt2", acadTermId: "t1" });

    expect(listMine).toHaveBeenCalledWith({ acadTermId: "t1" });
    expect(getArr).toHaveBeenCalledWith({ timetableId: "tt2" });
    const parsed = JSON.parse(textOf(result)) as ParsedDetail;
    expect(parsed.timetableId).toBe("tt2");
    expect(parsed.isActive).toBe(true);
    expect(parsed.termId).toBe("t1");
  });

  it("enriches isActive: false for a non-active timetable when both ids are given", async () => {
    const listMine = vi.fn().mockResolvedValue([
      { id: "tt1", name: "Old", isActive: false, acadTermId: "t1" },
      { id: "tt2", name: "Current", isActive: true, acadTermId: "t1" },
    ]);
    const getArr = vi
      .fn()
      .mockResolvedValue({ timetable: { id: "tt1", name: "Old" }, slots: [] });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ timetableListMine: listMine, timetableGetArrangement: getArr }),
    };
    const result = await getMyTimetableDetailTool.run(ctx, { timetableId: "tt1", acadTermId: "t1" });

    const parsed = JSON.parse(textOf(result)) as ParsedDetail;
    // Real value from the listMine enrichment - this timetable genuinely
    // is not active, so false is correct here.
    expect(parsed.isActive).toBe(false);
    expect(parsed.termId).toBe("t1");
  });

  it("omits isActive/termId when enrichment finds no match for the timetableId", async () => {
    const listMine = vi.fn().mockResolvedValue([
      { id: "tt1", name: "Old", isActive: false, acadTermId: "t1" },
    ]);
    const getArr = vi
      .fn()
      .mockResolvedValue({ timetable: { id: "ttX", name: "Unknown" }, slots: [] });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ timetableListMine: listMine, timetableGetArrangement: getArr }),
    };
    const result = await getMyTimetableDetailTool.run(ctx, { timetableId: "ttX", acadTermId: "t1" });

    expect(listMine).toHaveBeenCalledWith({ acadTermId: "t1" });
    expect(getArr).toHaveBeenCalledWith({ timetableId: "ttX" });
    const parsed = JSON.parse(textOf(result)) as ParsedDetail;
    expect(parsed.isActive).toBeUndefined();
    expect(parsed.termId).toBeUndefined();
  });

  it("falls back to the first timetable (mine[0]) when none is active for the term", async () => {
    const listMine = vi.fn().mockResolvedValue([
      { id: "tt1", name: "Old", isActive: false, acadTermId: "t1" },
      { id: "tt3", name: "New", isActive: false, acadTermId: "t1" },
    ]);
    const getArr = vi
      .fn()
      .mockResolvedValue({ timetable: { id: "tt1", name: "Old" }, slots: [] });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ timetableListMine: listMine, timetableGetArrangement: getArr }),
    };
    const result = await getMyTimetableDetailTool.run(ctx, { acadTermId: "t1" });

    expect(listMine).toHaveBeenCalledWith({ acadTermId: "t1" });
    expect(getArr).toHaveBeenCalledWith({ timetableId: "tt1" });
    const parsed = JSON.parse(textOf(result)) as ParsedDetail;
    expect(parsed.timetableId).toBe("tt1");
    // Real value from mine[0] - no active timetable exists, so false is correct.
    expect(parsed.isActive).toBe(false);
    expect(parsed.termId).toBe("t1");
  });

  it("returns errText when the user has no timetables for the term", async () => {
    const listMine = vi.fn().mockResolvedValue([]);
    const getArr = vi.fn();
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ timetableListMine: listMine, timetableGetArrangement: getArr }),
    };
    const result = await getMyTimetableDetailTool.run(ctx, { acadTermId: "t1" });

    expect(result.isError).toBe(true);
    expect(getArr).not.toHaveBeenCalled();
    expect(textOf(result)).toContain("timetable");
  });

  it("returns errText when neither timetableId nor acadTermId is provided", async () => {
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({}) };
    const result = await getMyTimetableDetailTool.run(ctx, {});
    expect(result.isError).toBe(true);
  });

  it("returns errText when timetable.getArrangement rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ timetableGetArrangement: fn }),
    };
    const result = await getMyTimetableDetailTool.run(ctx, { timetableId: "tt1" });
    expect(result.isError).toBe(true);
  });

  it("resolves the real timetable name via DB fallback for the timetableId-only main {slots,bids} shape", async () => {
    // Main getArrangement shape: { slots, bids } (no timetable object), and only
    // timetableId is given (no acadTermId enrichment). The tool must NOT degrade
    // name to the raw id; it must resolve via db.userTimetable.findUnique with
    // the signed-in user ownership check.
    userTimetableFindUnique.mockResolvedValue({
      id: "tt1",
      name: "AY24 T2 - Recovered Name",
      userId: "u1",
    });
    const mainArrangement = { slots: arrangement.slots, bids: [] };
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        timetableGetArrangement: vi.fn().mockResolvedValue(mainArrangement),
      }),
    };
    const result = await getMyTimetableDetailTool.run(ctx, { timetableId: "tt1" });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(textOf(result)) as ParsedDetail;
    expect(parsed.timetableId).toBe("tt1");
    expect(parsed.name).toBe("AY24 T2 - Recovered Name");
    expect(parsed.name).not.toBe("tt1");
    expect(parsed.slots).toHaveLength(2);
    expect(userTimetableFindUnique).toHaveBeenCalledWith({
      where: { id: "tt1" },
      select: { name: true, userId: true },
    });
  });

  it("returns the real timetable name for the main {slots,bids} shape when both timetableId and acadTermId are given", async () => {
    const listMine = vi.fn().mockResolvedValue([
      { id: "tt1", name: "AY24 T2 - My Plan", isActive: true, acadTermId: "t1" },
    ]);
    // Main shape: getArrangement returns { slots, bids } - no timetable object.
    const mainArrangement = { slots: arrangement.slots, bids: [] };

    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        timetableListMine: listMine,
        timetableGetArrangement: vi.fn().mockResolvedValue(mainArrangement),
      }),
    };
    const result = await getMyTimetableDetailTool.run(ctx, {
      timetableId: "tt1",
      acadTermId: "t1",
    });
    const parsed = JSON.parse(textOf(result)) as ParsedDetail;
    expect(parsed.timetableId).toBe("tt1");
    // Real name from listMine enrichment, not the raw id.
    expect(parsed.name).toBe("AY24 T2 - My Plan");
    expect(parsed.isActive).toBe(true);
    expect(parsed.termId).toBe("t1");
    expect(parsed.slots).toHaveLength(2);
  });

  it("handles the main {slots,bids} shape when only acadTermId is given", async () => {
    const listMine = vi.fn().mockResolvedValue([
      { id: "tt1", name: "Old", isActive: false, acadTermId: "t1" },
      { id: "tt2", name: "Current - Honors", isActive: true, acadTermId: "t1" },
    ]);
    const mainArrangement = { slots: [], bids: [] };
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        timetableListMine: listMine,
        timetableGetArrangement: vi.fn().mockResolvedValue(mainArrangement),
      }),
    };
    const result = await getMyTimetableDetailTool.run(ctx, { acadTermId: "t1" });
    const parsed = JSON.parse(textOf(result)) as ParsedDetail;
    expect(parsed.timetableId).toBe("tt2");
    expect(parsed.name).toBe("Current - Honors");
    expect(parsed.isActive).toBe(true);
  });
});
