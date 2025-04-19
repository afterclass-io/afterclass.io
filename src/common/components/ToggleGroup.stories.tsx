import type { Meta, StoryObj } from "@storybook/react";

import { ToggleGroup } from "./ToggleGroup";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/ToggleGroup",
  component: ToggleGroup,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {
    type: "single",
    size: "md",
    disabled: false,
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    console.log(args);
    return (
      <ToggleGroup {...args}>
        <ToggleGroup.Item value="down" aria-label="Toggle down">
          Down
        </ToggleGroup.Item>
        <ToggleGroup.Item value="check" aria-label="Toggle check">
          Check
        </ToggleGroup.Item>
        <ToggleGroup.Item value="lock" aria-label="Toggle lock">
          Lock
        </ToggleGroup.Item>
      </ToggleGroup>
    );
  },
};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Multiple: Story = {
  ...Default,
  args: {
    type: "multiple",
  },
};

export const Small: Story = {
  ...Default,
  args: {
    ...Default.args,
    size: "sm",
  },
};

export const Disabled: Story = {
  ...Default,
  args: {
    ...Default.args,
    disabled: true,
  },
};
