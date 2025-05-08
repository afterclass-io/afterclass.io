import type { Meta, StoryObj } from "@storybook/react";

import { CtaButton } from "./cta-button";
import { StarLineAltIcon } from "@/common/components/icons";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/CtaButton",
  component: CtaButton,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {
    ctaText: "Write a review",
    variant: "secondary",
    href: "",
    iconLeft: <StarLineAltIcon />,
    iconRight: <StarLineAltIcon />,
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof CtaButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecondaryCTA: Story = {
  ...Default,
  args: {
    ...Default.args,
    variant: "outline",
    ctaText: "Contribute to AfterClass OSS",
  },
};
