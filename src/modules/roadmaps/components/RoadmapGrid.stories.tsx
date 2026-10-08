import type { Meta, StoryObj } from "@storybook/nextjs";

import { RoadmapGrid } from "./RoadmapGrid";
import type { Entry } from "../functions/conflicts";

const meta = {
  title: "Roadmaps/RoadmapGrid",
  component: RoadmapGrid,
  tags: ["autodocs"],
  args: {
    roadmapId: "story-roadmap",
    entries: [],
    readOnly: false,
    onEntriesChange: () => {
      /* storybook no-op */
    },
  },
} satisfies Meta<typeof RoadmapGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const SAMPLE_ENTRIES: Entry[] = [
  {
    courseId: "cs101",
    courseCode: "CS101",
    courseName: "Introduction to Computer Science",
    creditUnits: 4,
    yearNumber: 1,
    term: "T1",
  },
  {
    courseId: "math201",
    courseCode: "MATH201",
    courseName: "Calculus I",
    creditUnits: 4,
    yearNumber: 1,
    term: "T1",
  },
  {
    courseId: "eng101",
    courseCode: "ENG101",
    courseName: "Academic Writing",
    creditUnits: 3,
    yearNumber: 1,
    term: "T2",
  },
  {
    courseId: "cs201",
    courseCode: "CS201",
    courseName: "Data Structures",
    creditUnits: 4,
    yearNumber: 2,
    term: "T1",
  },
  {
    courseId: "cs301",
    courseCode: "CS301",
    courseName: "Algorithms",
    creditUnits: 4,
    yearNumber: 2,
    term: "T2",
  },
];

const CONFLICT_ENTRIES: Entry[] = [
  {
    courseId: "cs101",
    courseCode: "CS101",
    courseName: "Introduction to Computer Science",
    creditUnits: 4,
    yearNumber: 1,
    term: "T1",
  },
  {
    courseId: "cs101",
    courseCode: "CS101",
    courseName: "Introduction to Computer Science",
    creditUnits: 4,
    yearNumber: 1,
    term: "T1",
  },
  {
    courseId: "math201",
    courseCode: "MATH201",
    courseName: "Calculus I",
    creditUnits: 4,
    yearNumber: 1,
    term: "T1",
  },
  {
    courseId: "eng101",
    courseCode: "ENG101",
    courseName: "Academic Writing",
    creditUnits: 3,
    yearNumber: 1,
    term: "T1",
  },
];

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const Empty: Story = {
  args: {
    entries: [],
  },
};

export const Populated: Story = {
  args: {
    entries: SAMPLE_ENTRIES,
  },
};

export const WithConflicts: Story = {
  args: {
    entries: CONFLICT_ENTRIES,
  },
};

export const ReadOnly: Story = {
  args: {
    entries: SAMPLE_ENTRIES,
    readOnly: true,
  },
};

export const T3Stacked: Story = {
  args: {
    entries: [
      {
        courseId: "cs101",
        courseCode: "CS101",
        courseName: "Introduction to Computer Science",
        creditUnits: 4,
        yearNumber: 1,
        term: "T1",
      },
      {
        courseId: "math201",
        courseCode: "MATH201",
        courseName: "Calculus I",
        creditUnits: 4,
        yearNumber: 1,
        term: "T2",
      },
      {
        courseId: "is111",
        courseCode: "IS111",
        courseName: "Introduction to Programming",
        creditUnits: 1,
        yearNumber: 1,
        term: "T3A",
      },
      {
        courseId: "is112",
        courseCode: "IS112",
        courseName: "Data Management",
        creditUnits: 1,
        yearNumber: 1,
        term: "T3B",
      },
    ],
  },
};

export const EmptyYears: Story = {
  args: {
    entries: [],
  },
};

export const ConflictInT3: Story = {
  args: {
    entries: [
      {
        courseId: "c1",
        courseCode: "CS101",
        courseName: "Introduction to Computer Science",
        creditUnits: 2,
        yearNumber: 1,
        term: "T3A",
      },
      {
        courseId: "c2",
        courseCode: "CS102",
        courseName: "Programming Fundamentals",
        creditUnits: 2,
        yearNumber: 1,
        term: "T3A",
      },
      {
        courseId: "c3",
        courseCode: "CS103",
        courseName: "Web Applications",
        creditUnits: 2,
        yearNumber: 1,
        term: "T3A",
      },
    ],
  },
};

export const WithTimetableFooters: Story = {
  args: {
    entries: SAMPLE_ENTRIES,
    termFooter: (yearNumber, term) => (
      <span className="text-muted-foreground text-[11px] font-medium">
        {term} timetable
      </span>
    ),
  },
};
