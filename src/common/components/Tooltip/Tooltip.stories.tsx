import type { Meta, StoryObj } from "@storybook/react";
import TwemojiBlueBook from "~icons/twemoji/blue-book";

import { Tooltip } from "./Tooltip";
import { Button } from "@/common/components/Button";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/Tooltip",
  component: Tooltip,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {},
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tooltip.Provider>
      <Tooltip>
        <Tooltip.Trigger>Hover me</Tooltip.Trigger>
        <Tooltip.Content>
          <div>Hidden Tooltip Content</div>
        </Tooltip.Content>
      </Tooltip>
    </Tooltip.Provider>
  ),
};

export const OpenByDefault: Story = {
  render: () => (
    <Tooltip.Provider>
      <Tooltip defaultOpen={true}>
        <Tooltip.Trigger>Hover me</Tooltip.Trigger>
        <Tooltip.Content>
          <div>Hidden Tooltip Content</div>
        </Tooltip.Content>
      </Tooltip>
    </Tooltip.Provider>
  ),
};

export const IconAsTrigger: Story = {
  render: () => (
    <Tooltip.Provider>
      <Tooltip defaultOpen={true}>
        <Tooltip.Trigger>
          <TwemojiBlueBook />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <div>Course</div>
        </Tooltip.Content>
      </Tooltip>
    </Tooltip.Provider>
  ),
};

export const ButtonAsTrigger: Story = {
  render: () => (
    <Tooltip.Provider>
      <Tooltip defaultOpen={true}>
        <Tooltip.Trigger>
          <Button size="sm">weird button</Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <div>This button does nothing</div>
        </Tooltip.Content>
      </Tooltip>
    </Tooltip.Provider>
  ),
};
