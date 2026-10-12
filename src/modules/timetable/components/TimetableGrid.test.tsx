// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ArrangedClass } from "@/common/types/timetable";

import { TimetableGrid } from "./TimetableGrid";

// Two classes overlap on Tuesday so layoutDay assigns sub-columns; one class
// has no timings and lands in the unscheduled tray.
const classes: ArrangedClass[] = [
  {
    classId: "c1",
    courseCode: "IS111",
    courseName: "Intro to Systems",
    section: "G1",
    professorName: "Prof A",
    creditUnits: 3,
    timings: [
      {
        dayOfWeek: "MON",
        startTime: "08:30",
        endTime: "10:00",
        venue: "SOE 1.1",
      },
      { dayOfWeek: "WED", startTime: "13:00", endTime: "14:30", venue: null },
    ],
    examTimings: [
      {
        date: "2026-11-20",
        dayOfWeek: "FRI",
        startTime: "09:00",
        endTime: "11:00",
        venue: "LKCSB Hall",
      },
    ],
  },
  {
    classId: "c2",
    courseCode: "IS216",
    courseName: "Web Apps",
    section: "T2",
    professorName: null,
    creditUnits: 3,
    timings: [
      { dayOfWeek: "TUE", startTime: "09:00", endTime: "10:30", venue: "B1" },
      { dayOfWeek: "TUE", startTime: "10:00", endTime: "11:30", venue: null },
    ],
    examTimings: [
      {
        date: "2026-11-23",
        dayOfWeek: "MON",
        startTime: "13:00",
        endTime: "15:00",
        venue: null,
      },
    ],
  },
  {
    classId: "c3",
    courseCode: "IS450",
    courseName: "Capstone",
    section: "G3",
    professorName: "Prof B",
    creditUnits: 6,
    timings: [],
    examTimings: [],
  },
];

describe("TimetableGrid render output", () => {
  it("renders the class layout with overlaps and the unscheduled tray", () => {
    const { container } = render(
      <TimetableGrid classes={classes} highlightNow={false} />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("renders the exam layout with venue and date badges", () => {
    const { container } = render(
      <TimetableGrid classes={classes} view="exams" highlightNow={false} />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });
});
