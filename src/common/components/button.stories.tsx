import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "./button";
import { StarLineAltIcon } from "@/common/components/icons";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/Button",
  component: Button,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {},
  args: {
    children: "primary",
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
const VariantsOfButtonTemplate: Story = {
  render: ({ variant }) => (
    <div className="flex max-w-[320px] flex-wrap gap-3">
      <Button variant={variant}>{variant as string}</Button>
      <Button variant={variant} aria-label="star">
        <StarLineAltIcon />
        {variant as string} with icon
      </Button>
      <Button variant={variant} size="icon">
        <StarLineAltIcon />
      </Button>
    </div>
  ),
};

export const VariantsOfPrimary: Story = {
  ...VariantsOfButtonTemplate,
  args: {},
};

export const VariantsOfSecondary: Story = {
  ...VariantsOfButtonTemplate,
  args: {
    variant: "secondary",
  },
};

export const VariantsOfOutline: Story = {
  ...VariantsOfButtonTemplate,
  args: {
    variant: "outline",
  },
};

export const VariantsOfDestructive: Story = {
  ...VariantsOfButtonTemplate,
  args: {
    variant: "destructive",
  },
};

export const VariantsOfGhost: Story = {
  ...VariantsOfButtonTemplate,
  args: {
    variant: "ghost",
  },
};

export const VariantsOfLink: Story = {
  ...VariantsOfButtonTemplate,
  args: {
    variant: "link",
  },
};
