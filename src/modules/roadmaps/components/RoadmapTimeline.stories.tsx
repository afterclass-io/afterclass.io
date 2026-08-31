import type { Meta, StoryObj } from "@storybook/nextjs";

import { RoadmapTimeline } from "./RoadmapTimeline";
import type { Entry } from "../functions/conflicts";

const meta = {
  title: "Roadmaps/RoadmapTimeline",
  component: RoadmapTimeline,
  tags: ["autodocs"],
  args: {
    entries: [],
    readOnly: false,
  },
} satisfies Meta<typeof RoadmapTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// Sample data (shared with RoadmapGrid stories)
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
