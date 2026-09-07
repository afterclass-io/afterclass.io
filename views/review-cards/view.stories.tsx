import type { Meta, StoryObj } from "@storybook/react";
import View from "./view";
import { withMcpView } from "../../.storybook/withMcpView";

/**
 * Stories for the review-cards View (mcp-use v2).
 *
 * Seeding mechanism: the shared `.storybook/withMcpView` decorator wraps each
 * story in the seed context consumed by the webpack-aliased
 * `.storybook/mocks/mcp-use-react.ts` module (the real v2 hooks require the
 * module-private bootstrapView runtime that only exists inside an MCP Apps
 * host, so Storybook runs against seeded implementations instead).
 */

const fullProps = {
  context: "ACCT102",
  reviews: [
    {
      id: "rv1",
      body: "Heavy group work but fair grading.",
      tips: "Start the project early.",
      rating: 4,
      labels: ["Group Work", "Fair"],
      voteCount: 12,
      createdAt: "2026-01-15T00:00:00.000Z",
      courseCode: "ACCT102",
      professorName: "FANG Bingxu",
    },
    {
      id: "rv2",
      body: "Tough curve.",
      tips: null,
      rating: 2,
      labels: [],
      voteCount: 0,
      createdAt: "2026-02-01T00:00:00.000Z",
      courseCode: "ACCT102",
      professorName: null,
    },
  ],
};

const meta: Meta<typeof View> = {
  title: "MCP Views/review-cards",
  component: View,
};

export default meta;
type Story = StoryObj<typeof View>;

/** Course-context reviews (kept as `Default` to preserve Chromatic baselines). */
export const Default: Story = {
  decorators: [withMcpView({ status: "ready", toolOutput: fullProps })],
};

/**
 * Professor-context reviews. `get-professor-reviews` is viewless (one tool
 * per view), so this story is the visual proof the shared cards handle the
 * professor shape: context is a professor name, courseCode is informational.
 */
const professorProps = {
  context: "FANG Bingxu",
  reviews: [
    {
      id: "rv-p1",
      body: "Clear lectures, generous with consultation.",
      tips: "Read the case before class.",
      rating: 5,
      labels: ["Clear", "Helpful"],
      voteCount: 21,
      createdAt: "2026-03-10T00:00:00.000Z",
      courseCode: "ACCT102",
      professorName: "FANG Bingxu",
    },
    {
      id: "rv-p2",
      body: "Fast-paced finals.",
      tips: null,
      rating: 3,
      labels: ["Tough Grading"],
      voteCount: 4,
      createdAt: "2026-04-02T00:00:00.000Z",
      courseCode: "ACCT102",
      professorName: "FANG Bingxu",
    },
  ],
};

export const ProfessorReviews: Story = {
  decorators: [withMcpView({ status: "ready", toolOutput: professorProps })],
};

export const Dark: Story = {
  decorators: [
    withMcpView({ status: "ready", toolOutput: fullProps, theme: "dark" }),
  ],
};

export const NoReviews: Story = {
  decorators: [
    withMcpView({
      status: "ready",
      toolOutput: { context: "ACCT102", reviews: [] },
    }),
  ],
};

export const Loading: Story = {
  decorators: [withMcpView({ status: "pending" })],
};

export const ErrorState: Story = {
  decorators: [
    withMcpView({ status: "error", error: { message: "Unauthorized" } }),
  ],
};

/** QuotaExceeded: the read budget is exhausted — friendly slow-down. */
export const QuotaExceeded: Story = {
  decorators: [
    withMcpView({
      status: "error",
      error: {
        message:
          "Read rate limit exceeded: at most 60 read operations per minute are allowed. Please wait ~7s before trying again.",
      },
    }),
  ],
};
