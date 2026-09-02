import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { upsertRoadmapEntryTool } from "./upsert-roadmap-entry";

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

function makeCaller(procs: Record<string, unknown>) {
  return {
    roadmaps: {
      listMine: procs.roadmapsListMine,
      getMine: procs.roadmapsGetMine,
      saveEntries: procs.roadmapsSaveEntries,
    },
    courses: { getByCourseCode: procs.coursesGetByCourseCode },
    timetable: { listMine: procs.timetableListMine, getArrangement: procs.timetableGetArrangement },
    acadTerms: { current: procs.acadTermsGetCurrent },
  } as unknown as ToolContext["caller"];
}

function entry(courseId: string, code: string, name: string, yearNumber: number, term: string, sortOrder = 0) {
  return {
    id: `e-${courseId}`,
    courseId,
    yearNumber,
    term,
    sortOrder,
    roadmapId: "r1",
    course: { code, name, creditUnits: 1, description: "" },
  };
}

describe("upsert-roadmap-entry", () => {
  it("is not read-only, exposes roadmap-view widget, and adds an entry additively without wiping others", async () => {
    const existing = [
      entry("c1", "COR-IS1702", "Comp Thinking", 1, "T1", 0),
      entry("c2", "IS215", "Digital Business", 1, "T2", 0),
    ];
    const getMine = vi.fn().mockResolvedValue({ roadmap: { id: "r1", name: "My Plan" }, entries: existing });
    // after saveEntries, getMine for buildRoadmapView should reflect the added entry
    const getMineAfter = vi.fn().mockResolvedValue({
      roadmap: { id: "r1", name: "My Plan" },
      entries: [...existing, entry("c3", "ACCT102", "Management Accounting", 3, "T1", 1)],
    });
    let callIdx = 0;
    const getMineCombined = vi.fn(
      async (a: { roadmapId: string }): Promise<unknown> => {
        callIdx += 1;
        if (callIdx === 1) return getMine(a);
        // feasibility's runFeasibility also calls getMine; and buildRoadmapView calls it.
        // Return the updated view for both.
        return getMineAfter(a);
      },
    );
    const saveEntries = vi.fn().mockResolvedValue({ count: 3, updatedAt: new Date().toISOString() });
    const caller = makeCaller({
      roadmapsGetMine: getMineCombined,
      roadmapsSaveEntries: saveEntries,
      coursesGetByCourseCode: vi.fn().mockResolvedValue({ id: "c3", code: "ACCT102", name: "Management Accounting" }),
      acadTermsGetCurrent: vi.fn().mockResolvedValue(null),
      timetableListMine: vi.fn().mockResolvedValue([]),
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await upsertRoadmapEntryTool.run(ctx, {
      roadmapId: "r1",
      courseCode: "ACCT102",
      yearNumber: 3,
      term: "T1",
    });

    expect(upsertRoadmapEntryTool.readOnly).not.toBe(true);
    expect(upsertRoadmapEntryTool.widgetName).toBe("roadmap-view");
    expect(res.isError).toBeFalsy();
    expect(saveEntries).toHaveBeenCalledTimes(1);
    const saved = saveEntries.mock.calls[0]![0] as { roadmapId: string; entries: Array<{ courseId: string }> };
    expect(saved.roadmapId).toBe("r1");
    // Additive: all prior entries preserved plus the new one
    expect(saved.entries.map((e) => e.courseId).sort()).toEqual(["c1", "c2", "c3"].sort());
    const parsed = JSON.parse(res.content[0]!.text) as { roadmapView: { roadmap: { id: string } }; feasibility: { issues: unknown[]; isFeasible: boolean } };
    expect(parsed.roadmapView.roadmap.id).toBe("r1");
    expect(typeof parsed.feasibility.isFeasible).toBe("boolean");
  });

  it("moves a course already in the roadmap (updates placement instead of duplicating)", async () => {
    const existing = [
      entry("c1", "COR-IS1702", "Comp Thinking", 1, "T1", 0),
      entry("c2", "ACCT102", "Management Accounting", 2, "T1", 0),
    ];
    const getMine = vi.fn().mockResolvedValue({ roadmap: { id: "r1", name: "My Plan" }, entries: existing });
    const getMineAfter = vi.fn().mockResolvedValue({
      roadmap: { id: "r1", name: "My Plan" },
      entries: [entry("c1", "COR-IS1702", "Comp Thinking", 1, "T1", 0), entry("c2", "ACCT102", "Management Accounting", 3, "T1", 1)],
    });
    let idx = 0;
    const combined = vi.fn(async (a: { roadmapId: string }): Promise<unknown> => {
      if (idx === 0) {
        idx += 1;
        return getMine(a);
      }
      return getMineAfter(a);
    });
    const saveEntries = vi.fn().mockResolvedValue({});
    const caller = makeCaller({
      roadmapsGetMine: combined,
      roadmapsSaveEntries: saveEntries,
      coursesGetByCourseCode: vi.fn().mockResolvedValue({ id: "c2", code: "ACCT102", name: "Management Accounting" }),
      acadTermsGetCurrent: vi.fn().mockResolvedValue(null),
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await upsertRoadmapEntryTool.run(ctx, { roadmapId: "r1", courseCode: "ACCT102", yearNumber: 3, term: "T1" });
    expect(res.isError).toBeFalsy();
    const saved = saveEntries.mock.calls[0]![0] as { entries: Array<{ courseId: string; yearNumber: number; term: string }> };
    // Deduplicated courseId: only one ACCT102
    expect(saved.entries.filter((e) => e.courseId === "c2")).toHaveLength(1);
    expect(saved.entries.find((e) => e.courseId === "c2")!.yearNumber).toBe(3);
  });

  it("resolves active roadmap when roadmapId is omitted", async () => {
    const existing: unknown[] = [];
    const listMine = vi.fn().mockResolvedValue([
      { id: "r2", name: "Secondary", isActive: false },
      { id: "r1", name: "Primary", isActive: true },
    ]);
    const getMine = vi.fn().mockResolvedValue({ roadmap: { id: "r1", name: "Primary" }, entries: existing });
    const getMineAfter = vi.fn().mockResolvedValue({
      roadmap: { id: "r1", name: "Primary" },
      entries: [entry("c3", "ACCT102", "Management Accounting", 3, "T1", 0)],
    });
    let idx = 0;
    const combined = vi.fn(async (a: { roadmapId: string }): Promise<unknown> => {
      if (idx === 0) {
        idx += 1;
        return getMine(a);
      }
      return getMineAfter(a);
    });
    const saveEntries = vi.fn().mockResolvedValue({});
    const caller = makeCaller({
      roadmapsListMine: listMine,
      roadmapsGetMine: combined,
      roadmapsSaveEntries: saveEntries,
      coursesGetByCourseCode: vi.fn().mockResolvedValue({ id: "c3", code: "ACCT102", name: "Management Accounting" }),
      acadTermsGetCurrent: vi.fn().mockResolvedValue(null),
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await upsertRoadmapEntryTool.run(ctx, { courseCode: "ACCT102", yearNumber: 3, term: "T1" });
    expect(res.isError).toBeFalsy();
    expect(saveEntries.mock.calls[0]![0]).toMatchObject({ roadmapId: "r1" });
  });

  it("returns errText when the course is not found", async () => {
    const caller = makeCaller({
      roadmapsGetMine: vi.fn().mockResolvedValue({ roadmap: { id: "r1", name: "My Plan" }, entries: [] }),
      coursesGetByCourseCode: vi.fn().mockResolvedValue(null),
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await upsertRoadmapEntryTool.run(ctx, { roadmapId: "r1", courseCode: "FAKE9999", yearNumber: 1, term: "T1" });
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toContain("not found");
  });

  it("returns errText when the user has no roadmaps and no roadmapId was given", async () => {
    const caller = makeCaller({
      roadmapsListMine: vi.fn().mockResolvedValue([]),
      roadmapsGetMine: vi.fn(),
      coursesGetByCourseCode: vi.fn().mockResolvedValue({ id: "c1", code: "ACCT102", name: "x" }),
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await upsertRoadmapEntryTool.run(ctx, { courseCode: "ACCT102", yearNumber: 1, term: "T1" });
    expect(res.isError).toBe(true);
  });

  it("returns errText when saveEntries rejects (e.g. CONFLICT)", async () => {
    const caller = makeCaller({
      roadmapsGetMine: vi.fn().mockResolvedValue({ roadmap: { id: "r1", name: "My Plan" }, entries: [] }),
      roadmapsSaveEntries: vi.fn().mockRejectedValue(new Error("CONFLICT: roadmap updated elsewhere")),
      coursesGetByCourseCode: vi.fn().mockResolvedValue({ id: "c3", code: "ACCT102", name: "Management Accounting" }),
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await upsertRoadmapEntryTool.run(ctx, { roadmapId: "r1", courseCode: "ACCT102", yearNumber: 1, term: "T1" });
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toContain("CONFLICT");
  });

  it("toWidgetProps normalizes the nested roadmapView payload", async () => {
    const existing: unknown[] = [];
    const getMine = vi.fn().mockResolvedValue({ roadmap: { id: "r1", name: "My Plan" }, entries: existing });
    const getMineAfter = vi.fn().mockResolvedValue({
      roadmap: { id: "r1", name: "My Plan" },
      entries: [entry("c3", "ACCT102", "Management Accounting", 3, "T1", 0)],
    });
    let idx = 0;
    const combined = vi.fn(async (a: { roadmapId: string }): Promise<unknown> => {
      if (idx === 0) {
        idx += 1;
        return getMine(a);
      }
      return getMineAfter(a);
    });
    const saveEntries = vi.fn().mockResolvedValue({});
    const caller = makeCaller({
      roadmapsGetMine: combined,
      roadmapsSaveEntries: saveEntries,
      coursesGetByCourseCode: vi.fn().mockResolvedValue({ id: "c3", code: "ACCT102", name: "Management Accounting" }),
      acadTermsGetCurrent: vi.fn().mockResolvedValue(null),
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await upsertRoadmapEntryTool.run(ctx, { roadmapId: "r1", courseCode: "ACCT102", yearNumber: 3, term: "T1" });
    const props = upsertRoadmapEntryTool.toWidgetProps?.(res);
    expect(props).toBeDefined();
    // roadmapViewToWidgetProps(false) should normalize roadmapView.roadmap + entries
    expect((props as { roadmapId?: string }).roadmapId).toBeTruthy();
  });

  it("includes feasibility with PREREQ_MISSING when the new course's prereq is not planned earlier", async () => {
    const existing = [entry("c1", "COR-STAT1202", "Stats", 1, "T1", 0)];
    const getMine = vi.fn().mockResolvedValue({ roadmap: { id: "r1", name: "My Plan" }, entries: existing });
    // After upsert, entries include IS215 in Y2T1 whose prereq COR-IS1702 is missing.
    const afterEntries = [
      entry("c1", "COR-STAT1202", "Stats", 1, "T1", 0),
      entry("c9", "IS215", "Digital Business", 2, "T1", 0),
    ];
    const getMineAfter = vi.fn().mockResolvedValue({ roadmap: { id: "r1", name: "My Plan" }, entries: afterEntries });
    // runFeasibility calls getMine again after saveEntries -> also afterEntries
    let idx = 0;
    const combined = vi.fn(async (a: { roadmapId: string }): Promise<unknown> => {
      if (idx === 0) {
        idx += 1;
        return getMine(a); // initial current entries
      }
      return getMineAfter(a); // buildRoadmapView + runFeasibility
    });
    const saveEntries = vi.fn().mockResolvedValue({});
    const getByCourseCode = vi.fn(
      async ({ code }: { code: string }): Promise<unknown> => {
        if (code === "IS215")
          return { id: "c9", code: "IS215", name: "Digital Business", enrolmentRequirements: "Pre-Requisite: COR-IS1702" };
        if (code === "COR-STAT1202") return { id: "c1", code: "COR-STAT1202", name: "Stats", enrolmentRequirements: null };
        return { id: "c9", code: "IS215", name: "Digital Business" };
      },
    );
    const caller = makeCaller({
      roadmapsGetMine: combined,
      roadmapsSaveEntries: saveEntries,
      coursesGetByCourseCode: getByCourseCode,
      acadTermsGetCurrent: vi.fn().mockResolvedValue(null),
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const res = await upsertRoadmapEntryTool.run(ctx, { roadmapId: "r1", courseCode: "IS215", yearNumber: 2, term: "T1" });
    expect(res.isError).toBeFalsy();
    const parsed = JSON.parse(res.content[0]!.text) as { feasibility: { issues: Array<{ type: string }>; isFeasible: boolean } };
    expect(parsed.feasibility.issues.some((i) => i.type === "PREREQ_MISSING")).toBe(true);
  });

  it("defaults sortOrder to next slot in the target year/term", async () => {
    const existing = [entry("c1", "COR-IS1702", "Comp Thinking", 3, "T1", 0)];
    const getMine = vi.fn().mockResolvedValue({ roadmap: { id: "r1", name: "My Plan" }, entries: existing });
    const getMineAfter = vi.fn().mockResolvedValue({
      roadmap: { id: "r1", name: "My Plan" },
      entries: [
        entry("c1", "COR-IS1702", "Comp Thinking", 3, "T1", 0),
        entry("c3", "ACCT102", "Management Accounting", 3, "T1", 1),
      ],
    });
    let idx = 0;
    const combined = vi.fn(async (a: { roadmapId: string }): Promise<unknown> => {
      if (idx === 0) {
        idx += 1;
        return getMine(a);
      }
      return getMineAfter(a);
    });
    const saveEntries = vi.fn().mockResolvedValue({});
    const caller = makeCaller({
      roadmapsGetMine: combined,
      roadmapsSaveEntries: saveEntries,
      coursesGetByCourseCode: vi.fn().mockResolvedValue({ id: "c3", code: "ACCT102", name: "Management Accounting" }),
      acadTermsGetCurrent: vi.fn().mockResolvedValue(null),
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    await upsertRoadmapEntryTool.run(ctx, { roadmapId: "r1", courseCode: "ACCT102", yearNumber: 3, term: "T1" });
    const saved = saveEntries.mock.calls[0]![0] as { entries: Array<{ courseId: string; sortOrder: number }> };
    expect(saved.entries.find((e) => e.courseId === "c3")!.sortOrder).toBe(1);
  });
});
