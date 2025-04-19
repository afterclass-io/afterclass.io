import type { Meta, StoryObj } from "@storybook/react";

import { StatItem } from "./stat-item";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/StatItem",
  component: StatItem,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {
    label: "This is Unlocked",
    rating: "64%",
    isLocked: false,
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof StatItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const DefaultLocked: Story = {
  ...Default,
  args: {
    ...Default.args,
    label: "This is Locked",
    rating: "46%",
    isLocked: true,
  },
};

export const Horizontal: Story = {
  ...Default,
  args: {
    ...Default.args,
    label: "This is Unlocked",
    rating: "57%",
    isLocked: false,
    layout: "horizontal",
  },
};

export const HorizontalLocked: Story = {
  ...Default,
  args: {
    ...Default.args,
    label: "This is Locked",
    rating: "57%",
    isLocked: true,
    layout: "horizontal",
  },
};
