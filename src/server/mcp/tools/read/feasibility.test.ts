import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { checkRoadmapFeasibilityTool, extractPrereqCodes } from "./feasibility";

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

type Issue = { type: string; courseCode: string; courseName: string; detail: string };

// Each tool calls a procedure on a specific sub-router, so place each mock under
// the router namespace the tool actually uses. Distinct keys per sub-router so a
// tool calling the wrong router cannot accidentally hit a mock present elsewhere.
function makeCaller(procs: Record<string, unknown>) {
  return {
    roadmaps: { getMine: procs.roadmapsGetMine, listMine: procs.roadmapsListMine },
    courses: { getByCourseCode: procs.coursesGetByCourseCode },
    timetable: { listMine: procs.timetableListMine, getArrangement: procs.timetableGetArrangement },
  } as unknown as ToolContext["caller"];
}

function entry(code: string, name: string, yearNumber: number, term: string, id: string) {
  return {
    id,
    roadmapId: "r1",
    courseId: `course-${code}`,
    yearNumber,
    term,
    sortOrder: 0,
    course: { code, name, creditUnits: 1, description: "" },
  };
}

function emptyRoadmap() {
  return { roadmap: { id: "r1", name: "My Plan", matricTermId: "t1" }, entries: [] };
}

describe("extractPrereqCodes", () => {
  it("ignores the 'Mutually Exclusive' clause (case-insensitive) entirely", () => {
    expect(
      extractPrereqCodes(
        "Mutually Exclusive: EITHER ACCT102 OR ACCT104/112 Management Accounting",
      ),
    ).toEqual([]);
    expect(
      extractPrereqCodes(
        "Pre-Requisite: COR-IS1702 Mutually Exclusive: EITHER ACCT102 OR ACCT104/112",
      ),
    ).toEqual(["COR-IS1702"]);
    expect(
      extractPrereqCodes(
        "pre-requisite: EITHER ACCT102 OR Introduction to Programming mutually exclusive: ACCT104",
      ),
    ).toEqual(["ACCT102"]);
  });
});

describe("check-roadmap-feasibility", () => {
  it("is readOnly", () => {
    expect(checkRoadmapFeasibilityTool.readOnly).toBe(true);
  });

  it("flags PREREQ_MISSING when a course's prereq is not in earlier roadmap terms", async () => {
    const roadmap = {
      roadmap: { id: "r1", name: "My Plan", matricTermId: "t1" },
      entries: [
        entry("COR-STAT1202", "Stats", 1, "T1", "e1"),
        entry("IS215", "Digital Business", 2, "T1", "e2"),
      ],
    };
    const getByCourseCode = vi.fn(async ({ code }: { code: string }) => {
      if (code === "IS215") {
        return { code: "IS215", name: "Digital Business", courseArea: null, enrolmentRequirements: "Pre-Requisite: COR-IS1702" };
      }
      if (code === "COR-STAT1202") {
        return { code: "COR-STAT1202", name: "Stats", courseArea: null, enrolmentRequirements: null };
      }
      return null;
    });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        roadmapsGetMine: vi.fn().mockResolvedValue(roadmap),
        coursesGetByCourseCode: getByCourseCode,
      }),
    };
    const res = await checkRoadmapFeasibilityTool.run(ctx, { roadmapId: "r1" });
    const parsed = JSON.parse(res.content[0]!.text) as { issues: Issue[]; isFeasible: boolean };
    expect(parsed.isFeasible).toBe(false);
    const prereq = parsed.issues.find((i) => i.type === "PREREQ_MISSING");
    expect(prereq).toBeTruthy();
    expect(prereq?.courseCode).toBe("IS215");
    expect(prereq?.detail).toContain("COR-IS1702");
  });

  it("does not flag PREREQ_MISSING when the prereq is in an earlier roadmap term", async () => {
    const roadmap = {
      roadmap: { id: "r1", name: "My Plan", matricTermId: "t1" },
      entries: [
        entry("COR-IS1702", "Computational Thinking", 1, "T1", "e1"),
        entry("IS215", "Digital Business", 2, "T1", "e2"),
      ],
    };
    const getByCourseCode = vi.fn(async ({ code }: { code: string }) => {
      if (code === "IS215") {
        return { code: "IS215", name: "Digital Business", courseArea: null, enrolmentRequirements: "Pre-Requisite: COR-IS1702" };
      }
      return { code, name: code, courseArea: null, enrolmentRequirements: null };
    });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        roadmapsGetMine: vi.fn().mockResolvedValue(roadmap),
        coursesGetByCourseCode: getByCourseCode,
      }),
    };
    const res = await checkRoadmapFeasibilityTool.run(ctx, { roadmapId: "r1" });
    const parsed = JSON.parse(res.content[0]!.text) as { issues: Issue[]; isFeasible: boolean };
    expect(parsed.issues.some((i) => i.type === "PREREQ_MISSING")).toBe(false);
  });

  it("does not flag PREREQ_MISSING for codes in a 'Mutually Exclusive' clause", async () => {
    const roadmap = {
      roadmap: { id: "r1", name: "My Plan", matricTermId: "t1" },
      entries: [
        entry("COR-IS1702", "Computational Thinking", 1, "T1", "e1"),
        entry("ACCT104", "Company Accounting", 2, "T1", "e2"),
      ],
    };
    const getByCourseCode = vi.fn(async ({ code }: { code: string }) => {
      if (code === "ACCT104") {
        return {
          code: "ACCT104",
          name: "Company Accounting",
          courseArea: null,
          enrolmentRequirements:
            "Pre-Requisite: COR-IS1702 Mutually Exclusive: EITHER ACCT102 OR ACCT104/112 Management Accounting",
        };
      }
      return { code, name: code, courseArea: null, enrolmentRequirements: null };
    });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        roadmapsGetMine: vi.fn().mockResolvedValue(roadmap),
        coursesGetByCourseCode: getByCourseCode,
      }),
    };
    const res = await checkRoadmapFeasibilityTool.run(ctx, { roadmapId: "r1" });
    const parsed = JSON.parse(res.content[0]!.text) as { issues: Issue[]; isFeasible: boolean };
    // ACCT102/ACCT112 come from the mutual-exclusion clause -> must NOT be PREREQ_MISSING.
    expect(parsed.issues.some((i) => i.type === "PREREQ_MISSING")).toBe(false);
    expect(parsed.isFeasible).toBe(true);
  });

  it("flags EXAM_CLASH for two classes with overlapping exams in the term's timetable", async () => {
    const arrangement = {
      timetable: { id: "tt1", name: "Term 2" },
      slots: [
        {
          classId: "cl1",
          courseCode: "FIN202",
          courseName: "Finance",
          section: "G1",
          professorName: null,
          creditUnits: 1,
          timings: [],
          examTimings: [{ id: "x1", date: "2026-04-12", dayOfWeek: "Sun", startTime: "09:00", endTime: "12:00", venue: null }],
        },
        {
          classId: "cl2",
          courseCode: "MGMT1302",
          courseName: "Management",
          section: "G1",
          professorName: null,
          creditUnits: 1,
          timings: [],
          examTimings: [{ id: "x2", date: "2026-04-12", dayOfWeek: "Sun", startTime: "10:00", endTime: "13:00", venue: null }],
        },
      ],
    };
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        roadmapsGetMine: vi.fn().mockResolvedValue(emptyRoadmap()),
        coursesGetByCourseCode: vi.fn().mockResolvedValue(null),
        timetableListMine: vi.fn().mockResolvedValue([{ id: "tt1", name: "Term 2", isActive: true, acadTermId: "t2" }]),
        timetableGetArrangement: vi.fn().mockResolvedValue(arrangement),
      }),
    };
    const res = await checkRoadmapFeasibilityTool.run(ctx, { roadmapId: "r1", termId: "t2" });
    const parsed = JSON.parse(res.content[0]!.text) as { issues: Issue[]; isFeasible: boolean };
    expect(parsed.isFeasible).toBe(false);
    const clash = parsed.issues.find((i) => i.type === "EXAM_CLASH");
    expect(clash).toBeTruthy();
    expect(clash?.detail).toContain("FIN202");
    expect(clash?.detail).toContain("MGMT1302");
  });

  it("reports every distinct EXAM_CLASH pair (not just the first per course)", async () => {
    const arrangement = {
      timetable: { id: "tt1", name: "Term 2" },
      slots: [
        {
          classId: "cl1",
          courseCode: "FIN202",
          courseName: "Finance",
          section: "G1",
          professorName: null,
          creditUnits: 1,
          timings: [],
          examTimings: [{ id: "x1", date: "2026-04-12", dayOfWeek: "Sun", startTime: "09:00", endTime: "12:00", venue: null }],
        },
        {
          classId: "cl2",
          courseCode: "MGMT1302",
          courseName: "Management",
          section: "G1",
          professorName: null,
          creditUnits: 1,
          timings: [],
          examTimings: [{ id: "x2", date: "2026-04-12", dayOfWeek: "Sun", startTime: "10:00", endTime: "13:00", venue: null }],
        },
        {
          classId: "cl3",
          courseCode: "ACCT102",
          courseName: "Management Accounting",
          section: "G1",
          professorName: null,
          creditUnits: 1,
          timings: [],
          examTimings: [{ id: "x3", date: "2026-04-12", dayOfWeek: "Sun", startTime: "11:00", endTime: "14:00", venue: null }],
        },
      ],
    };
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        roadmapsGetMine: vi.fn().mockResolvedValue(emptyRoadmap()),
        coursesGetByCourseCode: vi.fn().mockResolvedValue(null),
        timetableListMine: vi.fn().mockResolvedValue([{ id: "tt1", name: "Term 2", isActive: true, acadTermId: "t2" }]),
        timetableGetArrangement: vi.fn().mockResolvedValue(arrangement),
      }),
    };
    const res = await checkRoadmapFeasibilityTool.run(ctx, { roadmapId: "r1", termId: "t2" });
    const parsed = JSON.parse(res.content[0]!.text) as { issues: Issue[]; isFeasible: boolean };
    const clashes = parsed.issues.filter((i) => i.type === "EXAM_CLASH");
    // FIN202&MGMT1302, FIN202&ACCT102, MGMT1302&ACCT102 - all three pairs.
    expect(clashes).toHaveLength(3);
  });

  it("does not flag EXAM_CLASH for non-overlapping exams", async () => {
    const arrangement = {
      timetable: { id: "tt1", name: "Term 2" },
      slots: [
        {
          classId: "cl1",
          courseCode: "FIN202",
          courseName: "Finance",
          section: "G1",
          professorName: null,
          creditUnits: 1,
          timings: [],
          examTimings: [{ id: "x1", date: "2026-04-12", dayOfWeek: "Sun", startTime: "09:00", endTime: "12:00", venue: null }],
        },
        {
          classId: "cl2",
          courseCode: "MGMT1302",
          courseName: "Management",
          section: "G1",
          professorName: null,
          creditUnits: 1,
          timings: [],
          examTimings: [{ id: "x2", date: "2026-04-12", dayOfWeek: "Sun", startTime: "14:00", endTime: "17:00", venue: null }],
        },
      ],
    };
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        roadmapsGetMine: vi.fn().mockResolvedValue(emptyRoadmap()),
        coursesGetByCourseCode: vi.fn().mockResolvedValue(null),
        timetableListMine: vi.fn().mockResolvedValue([{ id: "tt1", name: "Term 2", isActive: true, acadTermId: "t2" }]),
        timetableGetArrangement: vi.fn().mockResolvedValue(arrangement),
      }),
    };
    const res = await checkRoadmapFeasibilityTool.run(ctx, { roadmapId: "r1", termId: "t2" });
    const parsed = JSON.parse(res.content[0]!.text) as { issues: Issue[]; isFeasible: boolean };
    expect(parsed.issues.some((i) => i.type === "EXAM_CLASH")).toBe(false);
  });

  it("flags TERM_DUPLICATE when a course appears twice in the same roadmap term", async () => {
    const roadmap = {
      roadmap: { id: "r1", name: "My Plan", matricTermId: "t1" },
      entries: [
        entry("ACCT102", "Management Accounting", 1, "T1", "e1"),
        entry("ACCT102", "Management Accounting", 1, "T1", "e2"),
        entry("ACCT102", "Management Accounting", 2, "T1", "e3"), // different term: OK
      ],
    };
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        roadmapsGetMine: vi.fn().mockResolvedValue(roadmap),
        coursesGetByCourseCode: vi.fn().mockResolvedValue(null),
      }),
    };
    const res = await checkRoadmapFeasibilityTool.run(ctx, { roadmapId: "r1" });
    const parsed = JSON.parse(res.content[0]!.text) as { issues: Issue[]; isFeasible: boolean };
    expect(parsed.isFeasible).toBe(false);
    const dups = parsed.issues.filter((i) => i.type === "TERM_DUPLICATE");
    expect(dups).toHaveLength(1);
    expect(dups[0]?.courseCode).toBe("ACCT102");
    expect(dups[0]?.detail).toContain("Year 1");
    expect(dups[0]?.detail).toContain("T1");
  });

  it("reports a separate TERM_DUPLICATE issue per (yearNumber, term) occurrence", async () => {
    const roadmap = {
      roadmap: { id: "r1", name: "My Plan", matricTermId: "t1" },
      entries: [
        entry("ACCT102", "Management Accounting", 1, "T1", "e1"),
        entry("ACCT102", "Management Accounting", 1, "T1", "e2"),
        entry("ACCT102", "Management Accounting", 2, "T1", "e3"),
        entry("ACCT102", "Management Accounting", 2, "T1", "e4"),
      ],
    };
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        roadmapsGetMine: vi.fn().mockResolvedValue(roadmap),
        coursesGetByCourseCode: vi.fn().mockResolvedValue(null),
      }),
    };
    const res = await checkRoadmapFeasibilityTool.run(ctx, { roadmapId: "r1" });
    const parsed = JSON.parse(res.content[0]!.text) as { issues: Issue[]; isFeasible: boolean };
    const dups = parsed.issues.filter((i) => i.type === "TERM_DUPLICATE");
    expect(dups).toHaveLength(2);
    const details = dups.map((d) => d.detail).join(" ");
    expect(details).toContain("Year 1 T1");
    expect(details).toContain("Year 2 T1");
  });

  it("returns isFeasible true when there are no issues", async () => {
    const roadmap = {
      roadmap: { id: "r1", name: "My Plan", matricTermId: "t1" },
      entries: [entry("COR-STAT1202", "Stats", 1, "T1", "e1")],
    };
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        roadmapsGetMine: vi.fn().mockResolvedValue(roadmap),
        coursesGetByCourseCode: vi.fn().mockResolvedValue({ code: "COR-STAT1202", name: "Stats", courseArea: null, enrolmentRequirements: null }),
      }),
    };
    const res = await checkRoadmapFeasibilityTool.run(ctx, { roadmapId: "r1" });
    const parsed = JSON.parse(res.content[0]!.text) as { issues: Issue[]; isFeasible: boolean };
    expect(parsed.issues).toHaveLength(0);
    expect(parsed.isFeasible).toBe(true);
  });

  it("resolves the active roadmap when roadmapId is omitted", async () => {
    const listMine = vi
      .fn()
      .mockResolvedValue([
        { id: "r2", name: "Old", isActive: false },
        { id: "r1", name: "Active", isActive: true },
      ]);
    const getMine = vi.fn().mockResolvedValue(emptyRoadmap());
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        roadmapsListMine: listMine,
        roadmapsGetMine: getMine,
        coursesGetByCourseCode: vi.fn().mockResolvedValue(null),
      }),
    };
    const res = await checkRoadmapFeasibilityTool.run(ctx, {});
    expect(listMine).toHaveBeenCalledWith();
    expect(getMine).toHaveBeenCalledWith({ roadmapId: "r1" });
    expect(res.isError).toBeUndefined();
  });

  it("returns errText when the user has no roadmaps", async () => {
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ roadmapsListMine: vi.fn().mockResolvedValue([]) }),
    };
    const res = await checkRoadmapFeasibilityTool.run(ctx, {});
    expect(res.isError).toBe(true);
  });

  it("returns errText when roadmaps.getMine throws", async () => {
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ roadmapsGetMine: vi.fn().mockRejectedValue(new Error("forbidden")) }),
    };
    const res = await checkRoadmapFeasibilityTool.run(ctx, { roadmapId: "r1" });
    expect(res.isError).toBe(true);
  });

  it("skips EXAM_CLASH (without fabricating an issue) when termId is given but the term has no timetable", async () => {
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        roadmapsGetMine: vi.fn().mockResolvedValue(emptyRoadmap()),
        coursesGetByCourseCode: vi.fn().mockResolvedValue(null),
        timetableListMine: vi.fn().mockResolvedValue([]),
      }),
    };
    const res = await checkRoadmapFeasibilityTool.run(ctx, { roadmapId: "r1", termId: "t2" });
    const parsed = JSON.parse(res.content[0]!.text) as { issues: Issue[]; isFeasible: boolean };
    expect(parsed.issues.some((i) => i.type === "EXAM_CLASH")).toBe(false);
    expect(parsed.isFeasible).toBe(true);
  });

  it("documents in the description that EXAM_CLASH is skipped when the term has no timetable", () => {
    expect(checkRoadmapFeasibilityTool.description).toMatch(/no timetable exists/i);
    expect(checkRoadmapFeasibilityTool.description).toMatch(/skipped/i);
  });
});
