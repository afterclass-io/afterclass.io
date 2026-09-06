import { describe, expect, it } from "vitest";

import {
  checkExamClashes,
  checkPrereqs,
  checkTermDuplicates,
  createIssueCollector,
  dateKey,
  extractPrereqCodes,
  intervalsOverlap,
  sortByTerm,
  TERM_ORDER,
  toMinutes,
  type ExamSlot,
  type FeasibilityIssue,
} from "./feasibility-check";

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
  });

  it("returns [] for null/undefined/empty input", () => {
    expect(extractPrereqCodes(null)).toEqual([]);
    expect(extractPrereqCodes(undefined)).toEqual([]);
    expect(extractPrereqCodes("")).toEqual([]);
  });

  it("keeps the raw alternative-code suffix (ACCT104/112 -> ACCT104 + 112)", () => {
    expect(extractPrereqCodes("Pre-Requisite: ACCT104/112")).toEqual([
      "ACCT104",
      "112",
    ]);
  });
});

describe("TERM_ORDER / sortByTerm", () => {
  it("orders T1 < T2 < T3A < T3B within a year, years ascending", () => {
    expect(TERM_ORDER.T1).toBeLessThan(TERM_ORDER.T2!);
    expect(TERM_ORDER.T2).toBeLessThan(TERM_ORDER.T3A!);
    expect(TERM_ORDER.T3A).toBeLessThan(TERM_ORDER.T3B!);
    const sorted = sortByTerm([
      { yearNumber: 2, term: "T1" },
      { yearNumber: 1, term: "T3B" },
      { yearNumber: 1, term: "T1" },
    ]);
    expect(sorted.map((e) => `${e.yearNumber}${e.term}`)).toEqual([
      "1T1",
      "1T3B",
      "2T1",
    ]);
  });
});

describe("toMinutes / intervalsOverlap / dateKey", () => {
  it("parses HH:MM and rejects malformed input", () => {
    expect(toMinutes("09:00")).toBe(540);
    expect(toMinutes("18:30")).toBe(1110);
    expect(toMinutes("nope")).toBeNaN();
  });

  it("detects overlap; malformed times never overlap", () => {
    expect(intervalsOverlap("09:00", "11:00", "10:00", "12:00")).toBe(true);
    expect(intervalsOverlap("09:00", "10:00", "10:00", "11:00")).toBe(false);
    expect(intervalsOverlap("bad", "10:00", "09:00", "11:00")).toBe(false);
  });

  it("normalizes Date and string dates to YYYY-MM-DD", () => {
    expect(dateKey(new Date("2026-04-28T00:00:00.000Z"))).toBe("2026-04-28");
    expect(dateKey("2026-04-28T09:00:00.000Z")).toBe("2026-04-28");
  });
});

describe("checkTermDuplicates", () => {
  it("flags a course appearing twice in one year/term, once per term", () => {
    const { issues, flagCourse } = createIssueCollector();
    checkTermDuplicates(
      [
        {
          course: { code: "IS215", name: "Digital" },
          yearNumber: 1,
          term: "T1",
        },
        {
          course: { code: "IS215", name: "Digital" },
          yearNumber: 1,
          term: "T1",
        },
        {
          course: { code: "IS215", name: "Digital" },
          yearNumber: 1,
          term: "T2",
        },
        {
          course: { code: "IS215", name: "Digital" },
          yearNumber: 1,
          term: "T2",
        },
      ],
      flagCourse,
    );
    expect(issues).toHaveLength(2);
    expect(issues[0]!.detail).toContain("Year 1 T1");
    expect(issues[1]!.detail).toContain("Year 1 T2");
  });

  it("is silent when every course appears once per term", () => {
    const { issues, flagCourse } = createIssueCollector();
    checkTermDuplicates(
      [
        { course: { code: "A", name: "a" }, yearNumber: 1, term: "T1" },
        { course: { code: "B", name: "b" }, yearNumber: 1, term: "T1" },
      ],
      flagCourse,
    );
    expect(issues).toHaveLength(0);
  });
});

describe("checkPrereqs", () => {
  it("flags a course whose prereq is not in an earlier term, once per course", async () => {
    const { issues, flagCourse } = createIssueCollector();
    await checkPrereqs(
      [
        {
          course: { code: "IS215", name: "Digital" },
          yearNumber: 2,
          term: "T1",
        },
        {
          course: { code: "IS215", name: "Digital" },
          yearNumber: 2,
          term: "T2",
        },
      ],
      async (code) => (code === "IS215" ? "Pre-Requisite: COR-IS1702" : null),
      flagCourse,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.type).toBe("PREREQ_MISSING");
    expect(issues[0]!.detail).toContain("COR-IS1702");
  });

  it("is silent when the prereq is planned earlier", async () => {
    const { issues, flagCourse } = createIssueCollector();
    await checkPrereqs(
      [
        {
          course: { code: "COR-IS1702", name: "CT" },
          yearNumber: 1,
          term: "T1",
        },
        {
          course: { code: "IS215", name: "Digital" },
          yearNumber: 2,
          term: "T1",
        },
      ],
      async (code) => (code === "IS215" ? "Pre-Requisite: COR-IS1702" : null),
      flagCourse,
    );
    expect(issues).toHaveLength(0);
  });
});

describe("checkExamClashes", () => {
  const slot = (overrides: Partial<ExamSlot>): ExamSlot => ({
    courseCode: "A",
    courseName: "a",
    date: "2026-04-28",
    startTime: "09:00",
    endTime: "11:00",
    ...overrides,
  });

  it("flags overlapping exams for different courses, dedupes pairs", () => {
    const pushed: FeasibilityIssue[] = [];
    checkExamClashes(
      [
        slot({}),
        slot({
          courseCode: "B",
          courseName: "b",
          startTime: "10:00",
          endTime: "12:00",
        }),
      ],
      (i) => pushed.push(i),
    );
    expect(pushed).toHaveLength(1);
    expect(pushed[0]!.type).toBe("EXAM_CLASH");
    expect(pushed[0]!.detail).toContain("2026-04-28");
  });

  it("ignores same-course exams and non-overlapping times", () => {
    const pushed: FeasibilityIssue[] = [];
    checkExamClashes(
      [
        slot({}),
        slot({ startTime: "10:00", endTime: "12:00" }),
        slot({
          courseCode: "C",
          courseName: "c",
          startTime: "14:00",
          endTime: "16:00",
        }),
      ],
      (i) => pushed.push(i),
    );
    expect(pushed).toHaveLength(0);
  });
});
