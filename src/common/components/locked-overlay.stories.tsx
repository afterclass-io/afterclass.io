import type { Meta, StoryObj } from "@storybook/react";

import { LockedOverlay } from "./locked-overlay";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/LockedOverlay",
  component: LockedOverlay,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {},
  render: (args) => (
    <div className="text-accent-foreground relative flex h-16 w-full self-stretch overflow-hidden text-sm text-ellipsis">
      <LockedOverlay {...args} />
    </div>
  ),
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof LockedOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultForRating: Story = {};

export const BorderVariantForRating: Story = {
  ...DefaultForRating,
  args: {
    ...DefaultForRating.args,
    // variant: "border",
  },
};

export const DefaultForReview: Story = {
  ...DefaultForRating,
  args: {
    ...DefaultForRating.args,
    ctaType: "review",
  },
};

export const BorderVariantForReview: Story = {
  ...DefaultForReview,
  args: {
    ...DefaultForReview.args,
    // variant: "border",
  },
};
