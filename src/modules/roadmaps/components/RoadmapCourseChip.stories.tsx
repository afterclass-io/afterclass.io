import type { Meta, StoryObj } from "@storybook/react";

import { RoadmapCourseChip } from "./RoadmapCourseChip";

const meta = {
  title: "Roadmaps/RoadmapCourseChip",
  component: RoadmapCourseChip,
  tags: ["autodocs"],
  args: {
    courseId: "cs101",
    courseCode: "CS101",
    courseName: "Introduction to Computer Science",
    creditUnits: 4,
    draggable: false,
  },
} satisfies Meta<typeof RoadmapCourseChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Draggable: Story = {
  args: {
    draggable: true,
  },
};

export const NoCreditUnits: Story = {
  args: {
    creditUnits: 0,
  },
};

export const LongName: Story = {
  args: {
    courseCode: "ACCT401",
    courseName: "Advanced Financial Accounting and Reporting Standards",
    creditUnits: 4,
  },
};

export const Removable: Story = {
  args: {
    onRemove: () => {
      console.log("Remove clicked");
    },
  },
};
