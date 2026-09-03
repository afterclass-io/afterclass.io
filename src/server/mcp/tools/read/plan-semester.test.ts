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
function makeCaller(procs: Record<string, unknown>) {
  return {
    roadmaps: { planSemester: procs.roadmapsPlanSemester },
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
});
