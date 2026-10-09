import type { Meta, StoryObj } from "@storybook/nextjs";
import { fn } from "storybook/test";

import { ClassInfoButton } from "./ClassInfoButton";

const LONG_NAME =
  "Special Topics in Advanced Computational Methods for Financial Risk Analytics";

const meta = {
  title: "Timetable/ClassInfoButton",
  component: ClassInfoButton,
  tags: ["autodocs"],
  args: {
    onClick: fn(),
    children: "Digital Business Technology",
  },
  decorators: [
    (Story) => (
      <div className="w-44">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ClassInfoButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongClassName: Story = {
  args: {
    children: LONG_NAME,
    title: LONG_NAME,
  },
};
