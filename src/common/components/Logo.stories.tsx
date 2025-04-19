import type { Meta, StoryObj } from "@storybook/react";

import { Logo } from "./Logo";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/Logo",
  component: Logo,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {
    hideText: false,
    hideLogo: false,
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const LogoOnly: Story = {
  ...Default,
  args: {
    ...Default.args,
    hideText: true,
  },
};

export const TextOnly: Story = {
  ...Default,
  args: {
    ...Default.args,
    hideLogo: true,
  },
};
