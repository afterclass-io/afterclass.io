import { describe, expect, it } from "vitest";
import { toArrangedClass } from "./arranged-class";

const slot = {
  class: {
    id: "cl1",
    section: "G1",
    course: { code: "CS101", name: "Intro", creditUnits: 4 },
    professor: { name: "Prof A" },
    classTimings: [
      {
        dayOfWeek: "Mon",
        startTime: "08:15",
        endTime: "11:30",
        venue: "SOB-A",
      },
    ],
    classExamTimings: [
      {
        date: new Date("2026-12-01T00:00:00+08:00"),
        dayOfWeek: "Tue",
        startTime: "09:00",
        endTime: "12:00",
        venue: "SOB-B",
      },
    ],
  },
};

describe("toArrangedClass", () => {
  it("maps a slot to ArrangedClass with professor", () => {
    const result = toArrangedClass(slot);
    expect(result).toMatchObject({
      classId: "cl1",
      courseCode: "CS101",
      section: "G1",
      professorName: "Prof A",
      creditUnits: 4,
    });
    expect(result.timings[0]).toMatchObject({
      dayOfWeek: "Mon",
      startTime: "08:15",
      endTime: "11:30",
      venue: "SOB-A",
    });
    // examTimings mapping path — assert exact shape/fields to cover the
    // classExamTimings -> examTimings map in toArrangedClass.
    expect(result.examTimings).toEqual([
      {
        date: new Date("2026-12-01T00:00:00+08:00"),
        dayOfWeek: "Tue",
        startTime: "09:00",
        endTime: "12:00",
        venue: "SOB-B",
      },
    ]);
  });

  it("omits the professor name when requested (iCal no-PII rule)", () => {
    expect(
      toArrangedClass(slot, { omitProfessorName: true }).professorName,
    ).toBeNull();
  });

  it("falls back to professorName: null when professor is null", () => {
    const result = toArrangedClass({
      class: { ...slot.class, professor: null },
    });
    expect(result.professorName).toBeNull();
  });

  it("tolerates empty classTimings/classExamTimings", () => {
    const result = toArrangedClass({
      class: { ...slot.class, classTimings: [], classExamTimings: [] },
    });
    expect(result).toMatchObject({ timings: [], examTimings: [] });
  });

  it("passes real-world dayOfWeek strings ('Mon') through untouched", () => {
    expect(toArrangedClass(slot).timings[0]!.dayOfWeek).toBe("Mon");
  });
});
