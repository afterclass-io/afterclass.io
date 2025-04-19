import type { Meta, StoryObj } from "@storybook/react";

import { SchoolTag } from "./SchoolTag";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/SchoolTag",
  component: SchoolTag,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {
    school: "SMU",
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof SchoolTag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NUS: Story = {
  ...Default,
  args: {
    ...Default.args,
    school: "NUS",
  },
};

export const NTU: Story = {
  ...Default,
  args: {
    ...Default.args,
    school: "NTU",
  },
};
