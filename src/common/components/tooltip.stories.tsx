import type { Meta, StoryObj } from "@storybook/react";

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./tooltip";
import { BooksColoredIcon } from "@/common/components/icons";
import { Button } from "@/common/components/button";

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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>
          <div>Hidden Tooltip Content</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const OpenByDefault: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip defaultOpen={true}>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>
          <div>Hidden Tooltip Content</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const IconAsTrigger: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip defaultOpen={true}>
        <TooltipTrigger>
          <BooksColoredIcon />
        </TooltipTrigger>
        <TooltipContent>
          <div>Course</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const ButtonAsTrigger: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip defaultOpen={true}>
        <TooltipTrigger>
          <Button size="sm">weird button</Button>
        </TooltipTrigger>
        <TooltipContent>
          <div>This button does nothing</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};
