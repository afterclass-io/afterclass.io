import { describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { planSemesterTool } from "./plan-semester";

// plan-semester resolves string facultyId acronyms via db.faculties (see
// faculties.ts); mock the store the same way account.test.ts does.
const { facultiesFindMany } = vi.hoisted(() => ({
  facultiesFindMany: vi.fn() as Mock,
}));

vi.mock("@/server/db", () => ({
  db: { faculties: { findMany: facultiesFindMany } },
}));

const FACULTY_ROWS = [
  { id: 1, acronym: "LKCSB" },
  { id: 4, acronym: "SCIS" },
];

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

// The tool calls `caller.roadmaps.planSemester`, so the mock lives under the
// `roadmaps` sub-router namespace with a distinct key (repo convention).
// The Task 5 goal fallback also uses `caller.timetable.searchCourses` and
// `caller.acadTerms.list` for term fan-out.
function makeCaller(procs: Record<string, unknown>) {
  return {
    roadmaps: { planSemester: procs.roadmapsPlanSemester },
    timetable: { searchCourses: procs.searchCourses },
    acadTerms: { list: procs.acadTermsList },
  } as unknown as ToolContext["caller"];
}

const plan = {
  targetTerm: { id: "2025-T3A", acadYearStart: 2025, term: "3A" },
  userPosition: { yearNumber: 2, term: "T3A" },
  candidates: [
    {
      courseId: "c1",
      code: "ACCT101",
      name: "Financial Accounting",
      creditUnits: 1,
      seniorCount: 2,
      topSeniorRoadmap: { name: "Alice's Plan", ownerUsername: "alice" },
    },
  ],
  totalSeniors: 2,
};

describe("plan-semester", () => {
  it("exposes the exact tool name and is readOnly", () => {
    expect(planSemesterTool.name).toBe("plan-semester");
    expect(planSemesterTool.readOnly).toBe(true);
  });

  it("passes the input through to caller.roadmaps.planSemester and wraps the JSON result", async () => {
    const fn = vi.fn().mockResolvedValue(plan);
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ roadmapsPlanSemester: fn }),
    };

    const res = await planSemesterTool.run(ctx, { targetTermId: "2025-T3A", limit: 10 });

    expect(res.isError).toBeFalsy();
    expect(fn).toHaveBeenCalledWith({ targetTermId: "2025-T3A", limit: 10 });
    expect(JSON.parse(res.content[0]!.text)).toEqual(plan);
  });

  it("returns errText when the procedure rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ roadmapsPlanSemester: fn }),
    };

    const res = await planSemesterTool.run(ctx, { limit: 10 });

    expect(res.isError).toBe(true);
  });

  it("resolves a faculty acronym (SCIS) to its numeric id", async () => {
    facultiesFindMany.mockResolvedValue(FACULTY_ROWS);
    const fn = vi.fn().mockResolvedValue(plan);
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ roadmapsPlanSemester: fn }),
    };

    const res = await planSemesterTool.run(ctx, { limit: 10, facultyId: "SCIS" });

    expect(res.isError).toBeFalsy();
    expect(fn).toHaveBeenCalledWith({ limit: 10, facultyId: 4 });
  });

  it("returns a friendly error for an unknown faculty acronym without calling the procedure", async () => {
    facultiesFindMany.mockResolvedValue(FACULTY_ROWS);
    const fn = vi.fn().mockResolvedValue(plan);
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ roadmapsPlanSemester: fn }),
    };

    const res = await planSemesterTool.run(ctx, { limit: 10, facultyId: "NOPE" });

    expect(res.isError).toBe(true);
    expect(fn).not.toHaveBeenCalled();
  });

  it("passes goal through to the procedure but returns senior candidates unchanged when non-empty", async () => {
    const fn = vi.fn().mockResolvedValue(plan);
    const search = vi.fn();
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ roadmapsPlanSemester: fn, searchCourses: search }),
    };

    const res = await planSemesterTool.run(ctx, { limit: 10, goal: "data engineering" });

    expect(res.isError).toBeFalsy();
    // goal is a tool-layer param: stripped before the procedure call.
    expect(fn).toHaveBeenCalledWith({ limit: 10 });
    expect(search).not.toHaveBeenCalled();
    expect(JSON.parse(res.content[0]!.text)).toEqual(plan);
  });

  it("falls back to catalog search with reason when candidates are empty and goal is present", async () => {
    const empty = { ...plan, candidates: [] };
    const fn = vi.fn().mockResolvedValue(empty);
    const search = vi.fn().mockResolvedValue([
      { id: "c9", code: "IS424", name: "Data Engineering", creditUnits: 1 },
    ]);
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ roadmapsPlanSemester: fn, searchCourses: search }),
    };

    const res = await planSemesterTool.run(ctx, { limit: 10, goal: "data engineering" });

    expect(res.isError).toBeFalsy();
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ query: "data engineering", acadTermId: "2025-T3A" }),
    );
    const parsed = JSON.parse(res.content[0]!.text) as {
      reason: string;
      candidates: Array<{ courseId: string; code: string; offeredIn: string[] }>;
    };
    expect(parsed.reason).toBe("fallback-catalog");
    expect(parsed.candidates).toHaveLength(1);
    expect(parsed.candidates[0]).toMatchObject({
      courseId: "c9",
      code: "IS424",
      offeredIn: ["2025-T3A"],
    });
  });

  it("returns the empty senior result unchanged when no goal is given", async () => {
    const empty = { ...plan, candidates: [] };
    const fn = vi.fn().mockResolvedValue(empty);
    const search = vi.fn();
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ roadmapsPlanSemester: fn, searchCourses: search }),
    };

    const res = await planSemesterTool.run(ctx, { limit: 10 });

    expect(res.isError).toBeFalsy();
    expect(search).not.toHaveBeenCalled();
    expect(JSON.parse(res.content[0]!.text)).toEqual(empty);
  });

  it("fans out to upcoming terms when the target term is thin, merging offeredIn", async () => {
    const empty = { ...plan, candidates: [] };
    const fn = vi.fn().mockResolvedValue(empty);
    const search = vi
      .fn()
      .mockResolvedValueOnce([]) // target term: nothing
      .mockResolvedValueOnce([
        { id: "c9", code: "IS424", name: "Data Engineering", creditUnits: 1 },
      ]) // next term: one hit (still thin vs limit 10, so fan-out continues)
      .mockResolvedValueOnce([]); // second upcoming term: nothing
    const terms = [
      { id: "2025-T3A", startDt: new Date("2026-01-01") },
      { id: "2025-T3B", startDt: new Date("2026-03-01") },
      { id: "2026-T1", startDt: new Date("2026-08-01") },
    ];
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        roadmapsPlanSemester: fn,
        searchCourses: search,
        acadTermsList: vi.fn().mockResolvedValue(terms),
      }),
    };

    const res = await planSemesterTool.run(ctx, { limit: 10, goal: "data engineering" });

    expect(res.isError).toBeFalsy();
    expect(search).toHaveBeenCalledTimes(3);
    expect(search.mock.calls.map((c) => (c[0] as { acadTermId: string }).acadTermId)).toEqual([
      "2025-T3A",
      "2025-T3B",
      "2026-T1",
    ]);
    const parsed = JSON.parse(res.content[0]!.text) as {
      reason: string;
      candidates: Array<{ courseId: string; offeredIn: string[] }>;
    };
    expect(parsed.reason).toBe("fallback-catalog");
    expect(parsed.candidates[0]).toMatchObject({
      courseId: "c9",
      offeredIn: ["2025-T3B"],
    });
  });
});
