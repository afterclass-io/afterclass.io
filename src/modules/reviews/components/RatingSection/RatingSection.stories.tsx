import type { Meta, StoryObj } from "@storybook/nextjs";

import { RatingSection } from "./RatingSection";
import { formatPercentage } from "@/common/functions";

const headingRatingItem = { label: "Average Rating", rating: 4.85 };
const ratingItems = [
  { label: "Engaging", rating: formatPercentage(0.64) },
  { label: "Fair Grading", rating: formatPercentage(0.78) },
  { label: "Knowledgeable", rating: formatPercentage(0.717) },
  { label: "Effective Teaching", rating: formatPercentage(0.78) },
  { label: "Manageable Workload", rating: formatPercentage(0.78) },
];

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/RatingSection",
  component: RatingSection,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {
    headingRatingItem: headingRatingItem,
    ratingItems: ratingItems,
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof RatingSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const DefaultLocked: Story = {
  ...Default,
  args: {
    ...Default.args,
    isLocked: true,
  },
};
