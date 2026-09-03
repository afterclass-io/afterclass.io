import { describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { PUBLIC_COURSE_FIELDS } from "@/server/api/courses/constants";
import { getClassesTool, getCourseTool, getProfessorTool, searchCoursesTool } from "./courses";

// search-courses resolves string facultyId acronyms via db.faculties (see
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

// Each tool calls a procedure on a specific sub-router (e.g. caller.timetable.searchCourses),
// so place each mock under the router namespace the tool actually uses.
function makeCaller(procs: Record<string, unknown>) {
  return {
    timetable: { searchCourses: procs.searchCourses },
    courses: { getByCourseCode: procs.getByCourseCode },
    classes: { getAll: procs.getAll },
    professors: { getBySlug: procs.getBySlug },
    acadTerms: { current: procs.acadTermsGetCurrent },
  } as unknown as ToolContext["caller"];
}

describe("search-courses", () => {
  it("calls timetable.searchCourses with acadTermId+query and returns JSON", async () => {
    const fn = vi.fn().mockResolvedValue([{ id: "c1", code: "ACC101" }]);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ searchCourses: fn }) };
    const result = await searchCoursesTool.run(ctx, { acadTermId: "t1", query: "acc" });
    expect(fn).toHaveBeenCalledWith({ acadTermId: "t1", query: "acc", facultyId: undefined });
    expect(result.isError).toBeUndefined();
  });

  it("returns errText when the procedure rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ searchCourses: fn }) };
    const result = await searchCoursesTool.run(ctx, { acadTermId: "t1", query: "acc" });
    expect(result.isError).toBe(true);
  });

  it("exposes course-search widget props including results", async () => {
    const fn = vi
      .fn()
      .mockResolvedValue([{ id: "c1", code: "ACC101", name: "Financial Accounting", creditUnits: 1 }]);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ searchCourses: fn }) };
    const result = await searchCoursesTool.run(ctx, { acadTermId: "t1", query: "acc" });
    const props = searchCoursesTool.toWidgetProps?.(result);
    expect(Array.isArray((props as { results?: unknown[] }).results)).toBe(true);
  });

  it("defaults acadTermId to the current term when omitted", async () => {
    const fn = vi.fn().mockResolvedValue([{ id: "c1", code: "ACC101" }]);
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        searchCourses: fn,
        acadTermsGetCurrent: vi.fn().mockResolvedValue({ id: "t1" }),
      }),
    };
    const result = await searchCoursesTool.run(ctx, { query: "acc" });
    expect(fn).toHaveBeenCalledWith({ acadTermId: "t1", query: "acc", facultyId: undefined });
    expect(result.isError).toBeUndefined();
  });

  it("treats an empty-string acadTermId as omitted and defaults to the current term (never sends '' to SQL)", async () => {
    const fn = vi.fn().mockResolvedValue([{ id: "c1", code: "ACC101" }]);
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        searchCourses: fn,
        acadTermsGetCurrent: vi.fn().mockResolvedValue({ id: "t1" }),
      }),
    };
    const result = await searchCoursesTool.run(ctx, { acadTermId: "", query: "acc" });
    expect(fn).toHaveBeenCalledWith({ acadTermId: "t1", query: "acc", facultyId: undefined });
    expect(result.isError).toBeUndefined();
  });

  it("returns a friendly error when acadTermId is omitted and there is no current term", async () => {
    const fn = vi.fn();
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        searchCourses: fn,
        acadTermsGetCurrent: vi.fn().mockResolvedValue(null),
      }),
    };
    const result = await searchCoursesTool.run(ctx, { query: "acc" });
    expect(result.isError).toBe(true);
    expect(fn).not.toHaveBeenCalled();
  });

  it("threads facultyId through to timetable.searchCourses", async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ searchCourses: fn }) };
    await searchCoursesTool.run(ctx, { acadTermId: "t1", query: "tech", facultyId: 4 });
    expect(fn).toHaveBeenCalledWith({ acadTermId: "t1", query: "tech", facultyId: 4 });
  });

  it("resolves a faculty acronym (SCIS) to its numeric id", async () => {
    facultiesFindMany.mockResolvedValue(FACULTY_ROWS);
    const fn = vi.fn().mockResolvedValue([]);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ searchCourses: fn }) };
    const result = await searchCoursesTool.run(ctx, { acadTermId: "t1", query: "tech", facultyId: "SCIS" });
    expect(result.isError).toBeFalsy();
    expect(fn).toHaveBeenCalledWith({ acadTermId: "t1", query: "tech", facultyId: 4 });
  });

  it("resolves acronyms case-insensitively", async () => {
    facultiesFindMany.mockResolvedValue(FACULTY_ROWS);
    const fn = vi.fn().mockResolvedValue([]);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ searchCourses: fn }) };
    await searchCoursesTool.run(ctx, { acadTermId: "t1", query: "tech", facultyId: "scis" });
    expect(fn).toHaveBeenCalledWith({ acadTermId: "t1", query: "tech", facultyId: 4 });
  });

  it("returns a friendly error for an unknown faculty acronym without calling the procedure", async () => {
    facultiesFindMany.mockResolvedValue(FACULTY_ROWS);
    const fn = vi.fn().mockResolvedValue([]);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ searchCourses: fn }) };
    const result = await searchCoursesTool.run(ctx, { acadTermId: "t1", query: "tech", facultyId: "NOPE" });
    expect(result.isError).toBe(true);
    expect(fn).not.toHaveBeenCalled();
  });

  it("description mentions description/courseArea matching", () => {
    expect(searchCoursesTool.description).toContain("description");
    expect(searchCoursesTool.description).toContain("courseArea");
  });
});

describe("get-course", () => {
  it("returns errText when course is not found", async () => {
    const fn = vi.fn().mockResolvedValue(null);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getByCourseCode: fn }) };
    const result = await getCourseTool.run(ctx, { code: "NOPE" });
    expect(result.isError).toBe(true);
  });

  it("returns JSON when found", async () => {
    const fn = vi.fn().mockResolvedValue({ code: "ACC101", name: "Financial Accounting" });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getByCourseCode: fn }) };
    const result = await getCourseTool.run(ctx, { code: "ACC101" });
    expect(result.isError).toBeUndefined();
  });

  it("returns the course's prerequisite/enrolment requirement fields when present", async () => {
    const fn = vi.fn().mockResolvedValue({
      code: "IS215",
      name: "Digital Business - Technologies and Transformation",
      courseArea: "Digital Business Core",
      enrolmentRequirements:
        "Pre-Requisite: EITHER Introduction to Programming OR Programming Fundamentals I",
    });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getByCourseCode: fn }) };
    const result = await getCourseTool.run(ctx, { code: "IS215" });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(parsed.enrolmentRequirements).toContain("Pre-Requisite");
    expect(parsed.courseArea).toBe("Digital Business Core");
  });

  it("PUBLIC_COURSE_FIELDS exposes the prereq/enrolment requirement columns", () => {
    // Regression guard: get-course reads through PUBLIC_COURSE_FIELDS, so the
    // course detail must select the SIS prereq columns (courseArea /
    // enrolmentRequirements) or the MCP surface omits prerequisites.
    expect(PUBLIC_COURSE_FIELDS.enrolmentRequirements).toBe(true);
    expect(PUBLIC_COURSE_FIELDS.courseArea).toBe(true);
  });
});

describe("get-classes", () => {
  it("passes filters through to classes.getAll", async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getAll: fn }) };
    await getClassesTool.run(ctx, { courseCode: "ACC101", acadTermId: "t1", limit: 5 });
    expect(fn).toHaveBeenCalledWith({ courseCode: "ACC101", acadTermId: "t1", limit: 5 });
  });

  it("clamps a limit above 20 down to 20", async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getAll: fn }) };
    await getClassesTool.run(ctx, { courseCode: "ACC101", limit: 100 });
    expect(fn).toHaveBeenCalledWith({ courseCode: "ACC101", limit: 20 });
  });

  it("passes a limit at or below 20 through unchanged", async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getAll: fn }) };
    await getClassesTool.run(ctx, { limit: 15 });
    expect(fn).toHaveBeenCalledWith({ limit: 15 });
  });

  it("threads day/startsAfter/endsBefore filters through to classes.getAll", async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getAll: fn }) };
    await getClassesTool.run(ctx, {
      courseCode: "ACC101",
      day: "Mon",
      startsAfter: "18:00",
      endsBefore: "22:00",
      limit: 10,
    });
    expect(fn).toHaveBeenCalledWith({
      courseCode: "ACC101",
      day: "Mon",
      startsAfter: "18:00",
      endsBefore: "22:00",
      limit: 10,
    });
  });

  it("passes single time filter startsAfter alone", async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getAll: fn }) };
    await getClassesTool.run(ctx, { startsAfter: "18:00", limit: 10 });
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ startsAfter: "18:00" }));
  });

  it("description mentions the new time filters", () => {
    expect(getClassesTool.description).toContain("day");
    expect(getClassesTool.description).toContain("startsAfter");
    expect(getClassesTool.description).toContain("endsBefore");
  });
});

describe("get-professor", () => {
  it("calls professors.getBySlug", async () => {
    const fn = vi.fn().mockResolvedValue({ name: "Prof X" });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getBySlug: fn }) };
    await getProfessorTool.run(ctx, { slug: "prof-x" });
    expect(fn).toHaveBeenCalledWith({ slug: "prof-x" });
  });
});
