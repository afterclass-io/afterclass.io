import type { Meta, StoryObj } from "@storybook/react";

import { NoticeCard } from "./NoticeCard";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/NoticeCard",
  component: NoticeCard,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {},
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof NoticeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Coming Soon",
    children: "Watch out for the red dot in the sidebar once this is done!",
  },
};

export const Error: Story = {
  args: {
    title: "Oh no!",
    children:
      "Click here to retry. Otherwise, you can get help from us @afterclass on Telegram.",
    isError: true,
  },
};
