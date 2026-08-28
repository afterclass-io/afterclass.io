import type { Meta, StoryObj } from "@storybook/nextjs";

import { SearchCmdk } from "./SearchCmdk";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/SearchCmdk",
  component: SearchCmdk,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {},
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof SearchCmdk>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
