import type { Meta, StoryObj } from "@storybook/react";
import { ClassCard } from "./ClassCard";
import { ClockIcon, GraduationCapColoredIcon, MemoIcon, PinIcon } from "@/common/components/icons";

const meta: Meta<typeof ClassCard> = {
  title: "Bid Analytics/ClassCard",
  component: ClassCard,
  tags: ["autodocs"],
  args: {
    section: "T01",
    classId: "12345",
    course: {
      code: "CS101",
      name: "Introduction to Computer Science: A very very long course name.",
    },
    professor: {
      name: "Dr. Jane Doe A Professor With An Equally Lengthy Name",
      slug: "jane-doe",
    },
    classTiming: [
      {
        dayOfWeek: "MON",
        startTime: "10:00",
        endTime: "12:00",
        venue: "COM1-201",
      },
      {
        dayOfWeek: "WED",
        startTime: "10:00",
        endTime: "12:00",
        venue: "COM1-201",
      },
    ],
    examTiming: [
      {
        date: new Date("2025-12-15T00:00:00Z"),
        dayOfWeek: "MON",
        startTime: "09:00",
        endTime: "12:00",
        venue: "TBA",
      },
    ],
  },
};

export default meta;

type Story = StoryObj<typeof meta>;


export const Default: Story = {};

export const NoProfessor: Story = {
  args: {
    professor: null,
  },
};


export const NoClassTimings: Story = {
  args: {
    classTiming: [],
  },
};


export const NoExamTimings: Story = {
  args: {
    examTiming: [],
  },
};


export const MultipleTimings: Story = {
  args: {
    classTiming: [
      {
        dayOfWeek: "MON",
        startTime: "10:00",
        endTime: "12:00",
        venue: "COM1-201",
      },
      {
        dayOfWeek: "TUE",
        startTime: "14:00",
        endTime: "16:00",
        venue: "COM1-202",
      },
    ],
    examTiming: [
      {
        date: new Date("2025-12-15T00:00:00Z"),
        dayOfWeek: "MON",
        startTime: "09:00",
        endTime: "12:00",
        venue: "TBA",
      },
      {
        date: new Date("2025-12-22T00:00:00Z"),
        dayOfWeek: "MON",
        startTime: "14:00",
        endTime: "17:00",
        venue: "COM1-201",
      },
    ],
  },
};


export const MissingExamDetails: Story = {
  args: {
    examTiming: [
      {
        date: new Date("2025-12-15T00:00:00Z"),
        dayOfWeek: "MON",
        // startTime and endTime are missing
        venue: "TBA",
      },
    ],
  },
};