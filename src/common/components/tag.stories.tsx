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
    children: "Default",
    variant: "soft",
    color: "default",
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
    onClick: () => {
      console.log("Clicked");
    },
  },
};

export const Clickable: Story = {
  ...Default,
  args: {
    ...Default.args,
    children: "Clickable",
    onClick: () => {
      console.log("Clicked");
    },
  },
};

export const NoDelete: Story = {
  ...Default,
  args: {
    ...Default.args,
    children: "No Delete",
    deletable: false,
  },
};

export const WithIcon: Story = {
  ...Default,
  args: {
    ...Default.args,
    children: "With Icon",
    avatar: <StarLineAltIcon size={16} />,
  },
};

export const CustomDeleteIcon: Story = {
  ...Default,
  args: {
    ...Default.args,
    children: "Custom Delete Icon",
    deleteIcon: <StarLineAltIcon size={16} />,
  },
};

export const Rounded: Story = {
  ...Default,
  args: {
    ...Default.args,
    children: "Custom Size",
    className: "rounded-full",
  },
};
