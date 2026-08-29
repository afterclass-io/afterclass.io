import type { Meta, StoryObj } from "@storybook/nextjs";
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
      {
        dayOfWeek: "MON",
        startTime: "10:00",
        endTime: "12:00",
        venue: "SOE-SR2-1",
      },
      {
        dayOfWeek: "WED",
        startTime: "10:00",
        endTime: "12:00",
        venue: "SOE-SR2-1",
      },
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
      {
        dayOfWeek: "TUE",
        startTime: "14:00",
        endTime: "17:00",
        venue: "SCIS-SR1",
      },
    ],
  }),
  makeClass({
    classId: "class-003",
    courseCode: "MGMT101",
    courseName: "Management of People at Work",
    section: "G3",
    professorName: null,
    timings: [
      {
        dayOfWeek: "THU",
        startTime: "08:30",
        endTime: "11:30",
        venue: "LKCSB-TR1",
      },
      {
        dayOfWeek: "FRI",
        startTime: "15:30",
        endTime: "18:30",
        venue: "LKCSB-TR2",
      },
    ],
  }),
];

const overlappingClasses: ArrangedClass[] = [
  makeClass({
    classId: "class-001",
    courseCode: "CS101",
    timings: [
      {
        dayOfWeek: "MON",
        startTime: "10:00",
        endTime: "14:00",
        venue: "SOE-SR2-1",
      },
    ],
  }),
  makeClass({
    classId: "class-002",
    courseCode: "IS201",
    timings: [
      {
        dayOfWeek: "MON",
        startTime: "12:00",
        endTime: "16:00",
        venue: "SCIS-SR1",
      },
    ],
  }),
  makeClass({
    classId: "class-003",
    courseCode: "MGMT101",
    timings: [
      {
        dayOfWeek: "MON",
        startTime: "11:00",
        endTime: "13:00",
        venue: "LKCSB-TR1",
      },
    ],
  }),
];

// One slot on each outer day column (Monday + Friday) so both edge-clipping
// cases are covered: Monday's left edge against the sticky time axis, Friday's
// right edge against the scrollport.
const edgeColumnClasses: ArrangedClass[] = [
  makeClass({
    classId: "class-004",
    courseCode: "CS101",
    courseName: "Monday Edge Slot",
    section: "G1",
    timings: [
      {
        dayOfWeek: "MON",
        startTime: "09:00",
        endTime: "11:00",
        venue: "SOE-SR2-1",
      },
    ],
  }),
  makeClass({
    classId: "class-005",
    courseCode: "MGMT101",
    courseName: "Friday Edge Slot",
    section: "G2",
    timings: [
      {
        dayOfWeek: "FRI",
        startTime: "14:00",
        endTime: "16:00",
        venue: "LKCSB-TR1",
      },
    ],
  }),
];

// Classes that exactly fill whole SMU periods — lets the period bands on the
// time axis be checked for edge-to-edge alignment with the class cards.
const periodAlignedClasses: ArrangedClass[] = [
  makeClass({
    classId: "class-006",
    courseCode: "ACC101",
    courseName: "Accounting",
    section: "G1",
    timings: [
      {
        dayOfWeek: "MON",
        startTime: "08:15",
        endTime: "11:30",
        venue: "SOE-SR2-1",
      },
    ],
  }),
  makeClass({
    classId: "class-007",
    courseCode: "FIN201",
    courseName: "Finance",
    section: "G2",
    timings: [
      {
        dayOfWeek: "TUE",
        startTime: "12:00",
        endTime: "15:15",
        venue: "SCIS-SR1",
      },
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
      <div className="min-w-[1024px] overflow-auto p-6">
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

/**
 * Classes that exactly fill whole SMU periods (08:15–11:30, 12:00–15:15), so
 * the period bands on the time axis align edge-to-edge with the class cards.
 */
export const PeriodAlignedClasses: Story = {
  args: {
    classes: periodAlignedClasses,
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

export const MobileAgenda: Story = {
  decorators: [
    (Story) => (
      <div className="w-[375px]">
        <Story />
      </div>
    ),
  ],
  args: {
    classes: defaultClasses,
  },
};

export const Dark: Story = {
  args: {
    classes: defaultClasses,
  },
  parameters: {
    themes: { themeOverride: "dark" },
  },
};

/**
 * One slot on each outer day column (Monday + Friday) with `highlightNow` on,
 * so the now-ring paints outside the card border box on both edges: Monday's
 * left ring must clear the sticky time axis, Friday's right ring/shadow must
 * clear the scrollport.
 */
export const EdgeColumns: Story = {
  args: {
    classes: edgeColumnClasses,
    highlightNow: true,
  },
};

export const EdgeColumnsDark: Story = {
  args: {
    classes: edgeColumnClasses,
    highlightNow: true,
  },
  parameters: {
    themes: { themeOverride: "dark" },
  },
};
