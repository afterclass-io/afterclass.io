import type { Meta, StoryObj } from "@storybook/nextjs";
import { BiddingClassList } from "./BiddingClassList";

interface ClassItem {
  id: string;
  section: string;
  course: { code?: string; name?: string };
  classTimings: {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    venue: string | null;
  }[];
  classExamTimings: {
    date?: Date;
    dayOfWeek?: string;
    startTime?: string;
    endTime?: string;
    venue?: string | null;
  }[];
  professor: { name?: string } | null;
}

const mockClass = (overrides?: Partial<ClassItem>): ClassItem => ({
  id: "class-001",
  section: "G1",
  course: { code: "IS215", name: "Digital Business Transformation" },
  classTimings: [
    {
      dayOfWeek: "Tue",
      startTime: "12:00",
      endTime: "15:15",
      venue: "SIS SR 2-1",
    },
  ],
  classExamTimings: [
    {
      date: new Date("2025-04-28"),
      dayOfWeek: "Mon",
      startTime: "13:00",
      endTime: "15:00",
      venue: null,
    },
  ],
  professor: { name: "WANG Zhaogang" },
  ...overrides,
});

const manyClasses = Array.from({ length: 35 }, (_, i) =>
  mockClass({
    id: `class-${String(i + 1).padStart(3, "0")}`,
    section: `G${i + 1}`,
    course: { code: `CS${100 + i}`, name: `Course ${i + 1}` },
  }),
);

const meta: Meta<typeof BiddingClassList> = {
  title: "Bid Analytics/BiddingClassList",
  component: BiddingClassList,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialClasses: [
      mockClass(),
      mockClass({
        id: "class-002",
        section: "G2",
        course: { code: "CS202", name: "Data Structures" },
      }),
      mockClass({
        id: "class-003",
        section: "G3",
        course: { code: "FNCE213", name: "Entrepreneurial Finance" },
        professor: { name: "Bowen WHITE" },
        classTimings: [
          {
            dayOfWeek: "Wed",
            startTime: "15:30",
            endTime: "18:45",
            venue: "LKCSB SR 2-2",
          },
        ],
      }),
    ],
  },
};

export const SingleClass: Story = {
  args: {
    initialClasses: [mockClass()],
  },
};

export const Empty: Story = {
  args: {
    initialClasses: [],
  },
};

export const ManyClasses: Story = {
  args: {
    initialClasses: manyClasses,
  },
};

export const TBAProfessor: Story = {
  args: {
    initialClasses: [
      mockClass({ id: "class-tba", section: "G99", professor: null }),
    ],
  },
};

export const MultipleTimings: Story = {
  args: {
    initialClasses: [
      mockClass({
        id: "class-multi",
        section: "G10",
        classTimings: [
          {
            dayOfWeek: "Mon",
            startTime: "08:30",
            endTime: "10:00",
            venue: "SOE LR 1",
          },
          {
            dayOfWeek: "Thu",
            startTime: "08:30",
            endTime: "10:00",
            venue: "SOE LR 1",
          },
        ],
        classExamTimings: [],
      }),
    ],
  },
};
