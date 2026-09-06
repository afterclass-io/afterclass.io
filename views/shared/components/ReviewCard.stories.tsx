import type { Meta, StoryObj } from "@storybook/react";
import { ReviewCard } from "./ReviewCard";
import { TOKENS } from "../tokens";

const courseReview = {
  id: "rv1",
  body: "Heavy group work but fair grading.",
  tips: "Start the project early.",
  rating: 4,
  labels: ["Group Work", "Fair"],
  voteCount: 12,
  createdAt: "2026-01-15T00:00:00.000Z",
  courseCode: "COR-MGMT1202",
  professorName: "Prof X",
};

const professorReview = {
  id: "rv-p1",
  body: "Clear lectures, generous with consultation.",
  tips: "Read the case before class.",
  rating: 5,
  labels: ["Clear", "Helpful"],
  voteCount: 21,
  createdAt: "2026-03-10T00:00:00.000Z",
  courseCode: "ACCT102",
  professorName: "FANG Bingxu",
};

const meta: Meta<typeof ReviewCard> = {
  title: "MCP Views/shared/ReviewCard",
  component: ReviewCard,
};

export default meta;
type Story = StoryObj<typeof ReviewCard>;

export const Course: Story = {
  args: { review: courseReview, c: TOKENS.light, dark: false },
};

export const Professor: Story = {
  args: { review: professorReview, c: TOKENS.light, dark: false },
};

export const Dark: Story = {
  args: { review: courseReview, c: TOKENS.dark, dark: true },
};
