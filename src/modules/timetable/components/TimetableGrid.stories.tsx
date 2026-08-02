import type { Meta, StoryObj } from "@storybook/react";
import { TimetableGrid } from "./TimetableGrid";
import type { ArrangedClass } from "./TimetableGrid";

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------

function makeClass(overrides: Partial<ArrangedClass> = {}): ArrangedClass {
  return {
    classId: "class-001",
    courseCode: "CS101",
    courseName: "Introduction to Computer Science",
    section: "G1",
    professorName: "Dr. Jane Doe",
    creditUnits: 1,
    timings: [
      { dayOfWeek: "MON", startTime: "10:00", endTime: "12:00", venue: "SOE-SR2-1" },
      { dayOfWeek: "WED", startTime: "10:00", endTime: "12:00", venue: "SOE-SR2-1" },
    ],
    examTimings: [],
    ...overrides,
  };
}

const defaultClasses: ArrangedClass[] = [
  makeClass(),
  makeClass({
    classId: "class-002",
    courseCode: "IS201",
    courseName: "Digital Business",
    section: "G2",
    professorName: "Prof. John Smith",
    timings: [
      { dayOfWeek: "TUE", startTime: "14:00", endTime: "17:00", venue: "SCIS-SR1" },
    ],
  }),
  makeClass({
    classId: "class-003",
    courseCode: "MGMT101",
    courseName: "Management of People at Work",
    section: "G3",
    professorName: null,
    timings: [
      { dayOfWeek: "THU", startTime: "08:30", endTime: "11:30", venue: "LKCSB-TR1" },
      { dayOfWeek: "FRI", startTime: "15:30", endTime: "18:30", venue: "LKCSB-TR2" },
    ],
  }),
];

const overlappingClasses: ArrangedClass[] = [
  makeClass({
    classId: "class-001",
    courseCode: "CS101",
    timings: [
      { dayOfWeek: "MON", startTime: "10:00", endTime: "14:00", venue: "SOE-SR2-1" },
    ],
  }),
  makeClass({
    classId: "class-002",
    courseCode: "IS201",
    timings: [
      { dayOfWeek: "MON", startTime: "12:00", endTime: "16:00", venue: "SCIS-SR1" },
    ],
  }),
  makeClass({
    classId: "class-003",
    courseCode: "MGMT101",
    timings: [
      { dayOfWeek: "MON", startTime: "11:00", endTime: "13:00", venue: "LKCSB-TR1" },
    ],
  }),
];

const examClasses: ArrangedClass[] = [
  makeClass({
    classId: "class-001",
    examTimings: [
      {
        date: new Date("2026-12-15T00:00:00+08:00"),
        dayOfWeek: "MON",
        startTime: "09:00",
        endTime: "12:00",
        venue: "MPSH-A",
      },
    ],
  }),
  makeClass({
    classId: "class-002",
    courseCode: "IS201",
    examTimings: [
      {
        date: new Date("2026-12-18T00:00:00+08:00"),
        dayOfWeek: "THU",
        startTime: "14:00",
        endTime: "17:00",
        venue: "MPSH-B",
      },
    ],
  }),
];

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

const meta: Meta<typeof TimetableGrid> = {
  title: "Timetable/TimetableGrid",
  component: TimetableGrid,
  tags: ["autodocs"],
  args: {
    classes: defaultClasses,
    view: "classes",
    highlightNow: false,
    readOnly: false,
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-5xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    classes: [],
  },
};

export const OneCourse: Story = {
  args: {
    classes: [makeClass()],
  },
};

export const ThreeCourses: Story = {
  args: {
    classes: defaultClasses,
  },
};

export const OverlappingSections: Story = {
  args: {
    classes: overlappingClasses,
  },
};

export const ExamView: Story = {
  args: {
    classes: examClasses,
    view: "exams",
  },
};

export const ReadOnly: Story = {
  args: {
    classes: defaultClasses,
    readOnly: true,
  },
};

export const UnscheduledClasses: Story = {
  args: {
    classes: [
      makeClass(),
      makeClass({
        classId: "class-004",
        courseCode: "FREE01",
        courseName: "Free Elective — No Scheduled Time",
        section: "G1",
        timings: [],
      }),
      makeClass({
        classId: "class-005",
        courseCode: "FREE02",
        courseName: "Another Unscheduled Course",
        section: "G2",
        timings: [],
      }),
    ],
  },
};
