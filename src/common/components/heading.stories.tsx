import type { Meta, StoryObj } from "@storybook/react";

import { Heading } from "./heading";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/Heading",
  component: Heading,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {},
  args: {
    as: "h1",
    className: "text-7xl",
    children: "Heading 1",
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Heading1: Story = {
  ...Default,
};

export const Heading2: Story = {
  ...Default,
  args: {
    ...Default.args,
    as: "h2",
    className: "text-6xl",
    children: "Heading 2",
  },
};

export const Heading3: Story = {
  ...Default,
  args: {
    ...Default.args,
    as: "h3",
    className: "text-5xl",
    children: "Heading 3",
  },
};

export const Heading4: Story = {
  ...Default,
  args: {
    ...Default.args,
    as: "h4",
    className: "text-4xl",
    children: "Heading 4",
  },
};

export const Heading5: Story = {
  ...Default,
  args: {
    ...Default.args,
    as: "h5",
    className: "text-3xl",
    children: "Heading 5",
  },
};

export const Heading6: Story = {
  ...Default,
  args: {
    ...Default.args,
    as: "h6",
    className: "text-2xl",
    children: "Heading 6",
  },
};

export const Heading7: Story = {
  ...Default,
  args: {
    ...Default.args,
    as: "h6",
    className: "text-xl",
    children: "Heading 7",
  },
};
