import type { Meta, StoryObj } from "@storybook/nextjs";

import { AnnouncementCarousel } from "./AnnouncementCarousel";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/AnnouncementCarousel",
  component: AnnouncementCarousel,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {},
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof AnnouncementCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="overflow-x-scroll">
      <AnnouncementCarousel />
    </div>
  ),
};
