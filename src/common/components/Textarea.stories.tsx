import type { Meta, StoryObj } from "@storybook/react";

import { Textarea } from "./textarea";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/Textarea",
  component: Textarea,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {
    placeholder: "Input",
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    return <Textarea {...args} />;
  },
};
export const DefaultSmall: Story = {
  ...Default,
  args: {
    ...Default.args,
    size: "sm",
  },
};
