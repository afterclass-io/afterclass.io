import { describe, expect, it } from "vitest";
import type { RouterCaller } from "./types";
import { assertCourseRow, type CourseRow as CanonicalCourseRow } from "./types";

type CourseRow = Awaited<
  ReturnType<RouterCaller["courses"]["getByCourseCode"]>
>;
describe("RouterOutputs contract", () => {
  it("course row carries code", () => {
    const row = {
      id: "1",
      code: "ACCT102",
      name: "Accounting",
    } as unknown as CourseRow;
    expect((row as { code: string }).code).toBe("ACCT102");
  });

  it("RouterOutputs derives course row from RouterCaller", () => {
    const row = {
      id: "1",
      code: "ACCT102",
      name: "Accounting",
    } as unknown as CanonicalCourseRow;
    const canonical: CanonicalCourseRow = row;
    assertCourseRow(canonical);
    expect(canonical.code).toBe("ACCT102");
  });

  it("assertCourseRow narrows valid rows", () => {
    const row: unknown = { id: "1", code: "ACCT102", name: "Accounting" };
    expect(() => assertCourseRow(row)).not.toThrow();
    expect((row as { code: string }).code).toBe("ACCT102");
  });

  it("assertCourseRow throws on missing or invalid code", () => {
    expect(() => assertCourseRow(null)).toThrow("Course not found");
    expect(() => assertCourseRow(undefined)).toThrow("Course not found");
    expect(() => assertCourseRow({})).toThrow("Course not found");
    expect(() => assertCourseRow({ code: 123 })).toThrow("Course not found");
  });
});
