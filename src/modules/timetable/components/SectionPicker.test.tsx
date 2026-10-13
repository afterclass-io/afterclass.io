// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { SectionOption } from "@/modules/timetable/hooks/use-slot-mutations";

vi.mock("@/modules/timetable/hooks/use-slot-mutations", () => ({
  useAddSlotMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useSetSlotSectionMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { SectionPicker } from "./SectionPicker";

const sections: SectionOption[] = [
  {
    classId: "s1",
    section: "G1",
    professorName: "Prof A",
    courseCode: "IS111",
    courseName: "Intro to Systems",
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
        startTime: "09:00",
        endTime: "11:00",
        venue: "LKCSB Hall",
      },
      { date: "2026-11-21", startTime: "14:00", endTime: "16:00" },
    ],
  },
  {
    classId: "s2",
    section: "T2",
    professorName: null,
    courseCode: "IS111",
    courseName: "Intro to Systems",
    creditUnits: 3,
    timings: [],
    examTimings: [],
  },
];

describe("SectionPicker render output", () => {
  it("renders class and exam timing lines with venues for each section", () => {
    const { container } = render(
      <SectionPicker
        courseId="course-1"
        courseCode="IS111"
        alreadyInTimetable={false}
        sections={sections}
      />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("renders swap actions when the course is already in the timetable", () => {
    const { container } = render(
      <SectionPicker
        courseId="course-1"
        courseCode="IS111"
        alreadyInTimetable
        sections={sections}
      />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });
});
