import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "@/common/components/button";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/HoverCard",
  component: HoverCard,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {
    children: (
      <div className="grid gap-4">
        <div className="space-y-2">
          <h4 className="leading-none font-medium">Dimensions</h4>
          <p className="text-muted-foreground text-sm">
            Set the dimensions for the layer.
          </p>
        </div>
        <div className="grid gap-2">
          <div className="grid grid-cols-3 items-center gap-4">
            <label htmlFor="width">Width</label>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <label htmlFor="maxWidth">Max. width</label>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <label htmlFor="height">Height</label>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <label htmlFor="maxHeight">Max. height</label>
          </div>
        </div>
      </div>
    ),
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button>HoverCard</Button>
      </HoverCardTrigger>
      <HoverCardContent>{args.children}</HoverCardContent>
    </HoverCard>
  ),
};
