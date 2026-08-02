import { describe, it, expect } from "vitest";
import { detectConflicts, findEntryByCourse } from "./conflicts";
import type { Entry, Conflict, ExamTiming } from "./conflicts";

// ---------------------------------------------------------------------------
// Helper factories
// ---------------------------------------------------------------------------

const mkEntry = (overrides: Partial<Entry> = {}): Entry => ({
  courseId: "course-1",
  courseCode: "ACCT101",
  courseName: "Financial Accounting",
  creditUnits: 1.0,
  yearNumber: 1,
  term: "T1",
  ...overrides,
});

const mkExam = (
  overrides: Partial<ExamTiming> = {},
): ExamTiming => ({
  courseId: "course-1",
  date: new Date("2026-08-15"),
  startTime: "09:00",
  endTime: "11:00",
  ...overrides,
});

// ---------------------------------------------------------------------------
// detectConflicts
// ---------------------------------------------------------------------------

describe("detectConflicts", () => {
  // ---- No conflicts ----
  it("returns an empty array when there are no conflicts", () => {
    const entries: Entry[] = [
      mkEntry({ courseId: "course-1", courseCode: "ACCT101", yearNumber: 1, term: "T1", creditUnits: 1.0 }),
      mkEntry({ courseId: "course-2", courseCode: "ECON102", yearNumber: 1, term: "T2", creditUnits: 1.0 }),
    ];
    expect(detectConflicts(entries)).toEqual([]);
  });

  // ---- Empty entries ----
  it("returns an empty array for empty entries", () => {
    expect(detectConflicts([])).toEqual([]);
  });

  // ---- Single entry ----
  it("returns an empty array for a single entry", () => {
    const entries: Entry[] = [mkEntry()];
    expect(detectConflicts(entries)).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // DUPLICATE
  // -----------------------------------------------------------------------

  it("detects duplicate when the same course appears twice in the same term", () => {
    const entries: Entry[] = [
      mkEntry({ courseId: "course-1", courseCode: "ACCT101", yearNumber: 1, term: "T1" }),
      mkEntry({ courseId: "course-1", courseCode: "ACCT101", yearNumber: 1, term: "T1" }),
    ];

    const result = detectConflicts(entries);

    expect(result).toHaveLength(1);
    const conflict = result[0]!;
    expect(conflict.kind).toBe("duplicate");
    expect(conflict.term).toEqual({ yearNumber: 1, term: "T1" });
    expect(conflict.courseCodes).toContain("ACCT101");
    expect(conflict.message).toBe("ACCT101 appears twice in Year 1 T1");
  });

  it("detects duplicate when the same course appears in a different term", () => {
    const entries: Entry[] = [
      mkEntry({ courseId: "course-1", courseCode: "ACCT101", yearNumber: 1, term: "T1" }),
      mkEntry({ courseId: "course-1", courseCode: "ACCT101", yearNumber: 1, term: "T2" }),
    ];

    const result = detectConflicts(entries);

    const duplicates = result.filter((c) => c.kind === "duplicate");
    expect(duplicates).toHaveLength(1);
    const conflict = duplicates[0]!;
    expect(conflict.term).toEqual({ yearNumber: 1, term: "T2" });
    expect(conflict.courseCodes).toContain("ACCT101");
    expect(conflict.message).toContain("Year 1 T1");
  });

  it("does NOT flag duplicate for the same course in the same term only once", () => {
    // A course appearing once in its term and never elsewhere is clean.
    const entries: Entry[] = [
      mkEntry({ courseId: "course-1", courseCode: "ACCT101", yearNumber: 1, term: "T1" }),
      mkEntry({ courseId: "course-2", courseCode: "ECON102", yearNumber: 1, term: "T2" }),
    ];

    const result = detectConflicts(entries);
    const duplicates = result.filter((c) => c.kind === "duplicate");
    expect(duplicates).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // findEntryByCourse
  // -----------------------------------------------------------------------

  it("findEntryByCourse returns the entry for an existing course", () => {
    const entries: Entry[] = [
      mkEntry({ courseId: "course-1", courseCode: "ACCT101", yearNumber: 1, term: "T1" }),
      mkEntry({ courseId: "course-2", courseCode: "ECON102", yearNumber: 1, term: "T2" }),
    ];

    const found = findEntryByCourse(entries, "course-2");
    expect(found?.courseCode).toBe("ECON102");
  });

  it("findEntryByCourse returns undefined for a course not in the roadmap", () => {
    const entries: Entry[] = [
      mkEntry({ courseId: "course-1", courseCode: "ACCT101", yearNumber: 1, term: "T1" }),
    ];

    expect(findEntryByCourse(entries, "course-999")).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // EXAM CLASH
  // -----------------------------------------------------------------------

  it("detects exam clash when two courses have overlapping exam times in the same term", () => {
    const entries: Entry[] = [
      mkEntry({ courseId: "course-1", courseCode: "ACCT101", yearNumber: 1, term: "T1" }),
      mkEntry({ courseId: "course-2", courseCode: "ECON102", yearNumber: 1, term: "T1" }),
    ];

    const examTimingsByTerm = new Map<string, ExamTiming[]>();
    examTimingsByTerm.set("1-T1", [
      mkExam({ courseId: "course-1", date: new Date("2026-08-15"), startTime: "09:00", endTime: "11:00" }),
      mkExam({ courseId: "course-2", date: new Date("2026-08-15"), startTime: "10:00", endTime: "12:00" }),
    ]);

    const result = detectConflicts(entries, examTimingsByTerm);

    const clashes = result.filter((c) => c.kind === "exam-clash");
    expect(clashes.length).toBeGreaterThanOrEqual(1);
    const clash = clashes[0]!;
    expect(clash.kind).toBe("exam-clash");
    expect(clash.term).toEqual({ yearNumber: 1, term: "T1" });
    expect(clash.courseCodes).toContain("ACCT101");
    expect(clash.courseCodes).toContain("ECON102");
    expect(clash.message).toMatch(/Exam clash/);
  });

  it("does NOT flag exam clash when exams do not overlap", () => {
    const entries: Entry[] = [
      mkEntry({ courseId: "course-1", courseCode: "ACCT101", yearNumber: 1, term: "T1" }),
      mkEntry({ courseId: "course-2", courseCode: "ECON102", yearNumber: 1, term: "T1" }),
    ];

    const examTimingsByTerm = new Map<string, ExamTiming[]>();
    examTimingsByTerm.set("1-T1", [
      mkExam({ courseId: "course-1", date: new Date("2026-08-15"), startTime: "09:00", endTime: "11:00" }),
      mkExam({ courseId: "course-2", date: new Date("2026-08-15"), startTime: "13:00", endTime: "15:00" }),
    ]);

    const result = detectConflicts(entries, examTimingsByTerm);

    const clashes = result.filter((c) => c.kind === "exam-clash");
    expect(clashes).toHaveLength(0);
  });

  it("does NOT flag exam clash when examTimingsByTerm is not provided", () => {
    const entries: Entry[] = [
      mkEntry({ courseId: "course-1", courseCode: "ACCT101", yearNumber: 1, term: "T1" }),
      mkEntry({ courseId: "course-2", courseCode: "ECON102", yearNumber: 1, term: "T1" }),
    ];

    // No examTimingsByTerm provided
    const result = detectConflicts(entries);

    const clashes = result.filter((c) => c.kind === "exam-clash");
    expect(clashes).toHaveLength(0);
  });

  it("does NOT flag exam clash when courses are in different terms", () => {
    const entries: Entry[] = [
      mkEntry({ courseId: "course-1", courseCode: "ACCT101", yearNumber: 1, term: "T1" }),
      mkEntry({ courseId: "course-2", courseCode: "ECON102", yearNumber: 1, term: "T2" }),
    ];

    const examTimingsByTerm = new Map<string, ExamTiming[]>();
    examTimingsByTerm.set("1-T1", [
      mkExam({ courseId: "course-1", date: new Date("2026-08-15"), startTime: "09:00", endTime: "11:00" }),
    ]);
    examTimingsByTerm.set("1-T2", [
      mkExam({ courseId: "course-2", date: new Date("2026-08-15"), startTime: "09:00", endTime: "11:00" }),
    ]);

    const result = detectConflicts(entries, examTimingsByTerm);

    const clashes = result.filter((c) => c.kind === "exam-clash");
    expect(clashes).toHaveLength(0);
  });

  it("detects exam clash when one exam starts exactly when another ends (boundary)", () => {
    const entries: Entry[] = [
      mkEntry({ courseId: "course-1", courseCode: "ACCT101", yearNumber: 1, term: "T1" }),
      mkEntry({ courseId: "course-2", courseCode: "ECON102", yearNumber: 1, term: "T1" }),
    ];

    const examTimingsByTerm = new Map<string, ExamTiming[]>();
    examTimingsByTerm.set("1-T1", [
      mkExam({ courseId: "course-1", date: new Date("2026-08-15"), startTime: "09:00", endTime: "11:00" }),
      mkExam({ courseId: "course-2", date: new Date("2026-08-15"), startTime: "11:00", endTime: "13:00" }),
    ]);

    const result = detectConflicts(entries, examTimingsByTerm);

    // Boundary case: 09:00-11:00 vs 11:00-13:00 should NOT clash
    // (one ends exactly when the other starts)
    const clashes = result.filter((c) => c.kind === "exam-clash");
    expect(clashes).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // CU OVERLOAD
  // -----------------------------------------------------------------------

  it("detects credit overload when sum of creditUnits in a term > 5.5", () => {
    const entries: Entry[] = [
      mkEntry({ courseId: "course-1", courseCode: "ACCT101", yearNumber: 1, term: "T1", creditUnits: 3.0 }),
      mkEntry({ courseId: "course-2", courseCode: "ECON102", yearNumber: 1, term: "T1", creditUnits: 3.0 }),
    ];

    const result = detectConflicts(entries);

    const overloads = result.filter((c) => c.kind === "cu-overload");
    expect(overloads).toHaveLength(1);
    const overload = overloads[0]!;
    expect(overload.kind).toBe("cu-overload");
    expect(overload.term).toEqual({ yearNumber: 1, term: "T1" });
    expect(overload.message).toMatch(/Credit overload/);
    expect(overload.message).toContain("6");
    expect(overload.message).toContain("Year 1 T1");
  });

  it("does NOT flag overload when sum ≤ 5.5 CU", () => {
    const entries: Entry[] = [
      mkEntry({ courseId: "course-1", courseCode: "ACCT101", yearNumber: 1, term: "T1", creditUnits: 3.0 }),
      mkEntry({ courseId: "course-2", courseCode: "ECON102", yearNumber: 1, term: "T1", creditUnits: 2.5 }),
    ];

    const result = detectConflicts(entries);

    const overloads = result.filter((c) => c.kind === "cu-overload");
    expect(overloads).toHaveLength(0);
  });

  it("detects overload at exactly 5.5 CU as NOT an overload", () => {
    const entries: Entry[] = [
      mkEntry({ courseId: "course-1", courseCode: "ACCT101", yearNumber: 1, term: "T1", creditUnits: 3.0 }),
      mkEntry({ courseId: "course-2", courseCode: "ECON102", yearNumber: 1, term: "T1", creditUnits: 2.5 }),
    ];

    const result = detectConflicts(entries);

    const overloads = result.filter((c) => c.kind === "cu-overload");
    expect(overloads).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // COMBINED
  // -----------------------------------------------------------------------

  it("detects multiple conflict types across different terms", () => {
    const entries: Entry[] = [
      // Year 1 T1: duplicate + overload (3+3 = 6 > 5.5)
      mkEntry({ courseId: "course-1", courseCode: "ACCT101", yearNumber: 1, term: "T1", creditUnits: 3.0 }),
      mkEntry({ courseId: "course-1", courseCode: "ACCT101", yearNumber: 1, term: "T1", creditUnits: 3.0 }),
      // Year 1 T2: exam clash
      mkEntry({ courseId: "course-2", courseCode: "ECON102", yearNumber: 1, term: "T2", creditUnits: 1.0 }),
      mkEntry({ courseId: "course-3", courseCode: "MATH103", yearNumber: 1, term: "T2", creditUnits: 1.0 }),
    ];

    const examTimingsByTerm = new Map<string, ExamTiming[]>();
    examTimingsByTerm.set("1-T2", [
      mkExam({ courseId: "course-2", date: new Date("2026-08-15"), startTime: "09:00", endTime: "11:00" }),
      mkExam({ courseId: "course-3", date: new Date("2026-08-15"), startTime: "10:00", endTime: "12:00" }),
    ]);

    const result = detectConflicts(entries, examTimingsByTerm);

    const duplicates = result.filter((c) => c.kind === "duplicate");
    const overloads = result.filter((c) => c.kind === "cu-overload");
    const clashes = result.filter((c) => c.kind === "exam-clash");

    expect(duplicates).toHaveLength(1);
    expect(overloads).toHaveLength(1);
    expect(clashes.length).toBeGreaterThanOrEqual(1);
    expect(result.length).toBeGreaterThanOrEqual(3);
  });
});
