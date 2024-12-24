import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./Input";

import PhStar from "~icons/ph/star";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/Input",
  component: Input,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {},
  args: {
    contentLeft: <PhStar />,
    contentRight: <PhStar />,
    placeholder: "placeholder",
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    contentLeft: <PhStar />,
    contentRight: <PhStar />,
    placeholder: "placeholder",
  },
};
