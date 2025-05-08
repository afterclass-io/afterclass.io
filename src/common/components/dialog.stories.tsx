import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "@/common/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/dialog";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/Dialog",
  component: Dialog,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {},
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const longText = `
  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla
  tincidunt, sapien nec varius aliquet, libero nunc tincidunt
  libero, nec dictum libero libero ac odio. Nulla facilisi. Sed
  auctor Lorem ipsum dolor sit amet, consectetur adipiscing elit.
  Nulla tincidunt, sapien nec varius aliquet, libero nunc tincidunt
  libero, nec dictum libero libero ac odio. Nulla facilisi. Sed
  auctor Lorem ipsum dolor sit amet, consectetur adipiscing elit.
  Nulla tincidunt, sapien nec varius aliquet, libero nunc tincidunt
  libero, nec dictum libero libero ac odio. Nulla facilisi. Sed
  auctor Lorem ipsum dolor sit amet, consectetur adipiscing elit.
  Nulla tincidunt, sapien nec varius aliquet, libero nunc tincidunt
  libero, nec dictum libero libero ac odio. Nulla facilisi. Sed
  auctor Lorem ipsum dolor sit amet, consectetur adipiscing elit.
  Nulla tincidunt, sapien nec varius aliquet, libero nunc tincidunt
  libero, nec dictum libero libero ac odio. Nulla facilisi. Sed
  auctor Lorem ipsum dolor sit amet, consectetur adipiscing elit.
  Nulla tincidunt, sapien nec varius aliquet, libero nunc tincidunt
  libero, nec dictum libero libero ac odio. Nulla facilisi. Sed
  auctor Lorem ipsum dolor sit amet, consectetur adipiscing elit.
  Nulla tincidunt, sapien nec varius aliquet, libero nunc tincidunt
  libero, nec dictum libero libero ac odio. Nulla facilisi. Sed
  auctor Lorem ipsum dolor sit amet, consectetur adipiscing elit.
  Nulla tincidunt, sapien nec varius aliquet, libero nunc tincidunt
  libero, nec dictum libero libero ac odio. Nulla facilisi. Sed
  auctor Lorem ipsum dolor sit amet, consectetur adipiscing elit.
  Nulla tincidunt, sapien nec varius aliquet, libero nunc tincidunt
  libero, nec dictum libero libero ac odio. Nulla facilisi. Sed
  auctor Lorem ipsum dolor sit amet, consectetur adipiscing elit.
  Nulla tincidunt, sapien nec varius aliquet, libero nunc tincidunt
  libero, nec dictum libero libero ac odio. Nulla facilisi. Sed
  auctor Lorem ipsum dolor sit amet, consectetur adipiscing elit.
  Nulla tincidunt, sapien nec varius aliquet, libero nunc tincidunt
  libero, nec dictum libero libero ac odio. Nulla facilisi. Sed
  auctor Lorem ipsum dolor sit amet, consectetur adipiscing elit.
  Nulla tincidunt, sapien nec varius aliquet, libero nunc tincidunt
  libero, nec dictum libero libero ac odio. Nulla facilisi. Sed
  auctor Lorem ipsum dolor sit amet, consectetur adipiscing elit.
  Nulla tincidunt, sapien nec varius aliquet, libero nunc tincidunt
  libero, nec dictum libero libero ac odio. Nulla facilisi. Sed
  auctor
  `;

export const Default: Story = {
  render: () => {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button>Dialog (outside) Buttons</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>All button variants</DialogTitle>
            <DialogDescription>Dialog overflows outside</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">{longText}</div>
          <DialogFooter>Footer</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
};
