import type { Meta, StoryObj } from "@storybook/react";

import { CtaCard } from "./CtaCard";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/CtaCard",
  component: CtaCard,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {
    ctaText: "Write a review",
    variant: "secondary",
    href: "",
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof CtaCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecondaryCTA: Story = {
  ...Default,
  args: {
    ...Default.args,
    variant: "tertiary",
    ctaText: "Contribute to AfterClass OSS",
  },
};
