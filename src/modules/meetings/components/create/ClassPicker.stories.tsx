import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import { ClassPicker, type ClassSelection } from "./ClassPicker";

const CLASSES = [
  { courseId: "c-215", code: "IS215", name: "Digital Business - Technologies and Transformation", section: "G1" },
  { courseId: "c-215", code: "IS215", name: "Digital Business - Technologies and Transformation", section: "G2" },
  { courseId: "c-216", code: "IS216", name: "Web Application Development II", section: "G1" },
  { courseId: "c-216", code: "IS216", name: "Web Application Development II", section: "G2" },
  { courseId: "c-111", code: "COR-STAT1202", name: "Statistical Thinking", section: "G10" },
];

const meta = {
  title: "Meetings/ClassPicker",
  component: ClassPicker,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  args: {
    classes: CLASSES,
    value: null,
    onChange: () => undefined,
  },
} satisfies Meta<typeof ClassPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: function Render(args) {
    const [value, setValue] = useState<ClassSelection | null>(args.value);
    return <ClassPicker {...args} value={value} onChange={setValue} />;
  },
};

export const Selected: Story = {
  render: function Render(args) {
    const [value, setValue] = useState<ClassSelection | null>({
      courseId: "c-215",
      section: "G1",
    });
    return <ClassPicker {...args} value={value} onChange={setValue} />;
  },
};

export const NoClassesThisTerm: Story = {
  args: { classes: [] },
};
