import type { Meta, StoryObj } from "@storybook/react";

import { StarLineAltIcon } from "@/common/components/icons";

import { Tag } from "./tag";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/Tag",
  component: Tag,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {
    contentLeft: <StarLineAltIcon />,
    contentRight: <StarLineAltIcon />,
    children: "Default",
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Active: Story = {
  ...Default,
  args: {
    ...Default.args,
    active: true,
  },
};

export const Clickable: Story = {
  ...Default,
  args: {
    ...Default.args,
    clickable: true,
  },
};
