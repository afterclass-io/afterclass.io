import type { Meta, StoryObj } from "@storybook/react";

import { BooksIcon, SchoolIcon } from "@/common/components/icons";

import { PageTitle } from "./page-title";
import { Tag } from "@/common/components/tag";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/PageTitle",
  component: PageTitle,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {
    contentLeft: <BooksIcon className="h-6 w-6" />,
    contentRight: (
      <Tag contentLeft={<SchoolIcon school="SMU" className="h-6 w-6" />}>
        SMU
      </Tag>
    ),
    children: "Business, Government and Society",
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof PageTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
