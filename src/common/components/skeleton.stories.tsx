import type { Meta, StoryObj } from "@storybook/nextjs";

import { Skeleton } from "./skeleton";

const meta = {
  title: "Common/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Box: Story = {
  args: { className: "h-5 w-40" },
};

// The shimmer takes the size of the content it replaces.
export const WrapsContent: Story = {
  args: {
    loading: true,
    children: <p className="text-2xl font-semibold">Average rating 4.2</p>,
  },
};

export const Loaded: Story = {
  args: {
    loading: false,
    children: <p className="text-2xl font-semibold">Average rating 4.2</p>,
  },
};
