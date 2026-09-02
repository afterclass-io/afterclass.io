import type { Meta, StoryObj } from "@storybook/react";
import View from "./view";
import { withMcpView } from "../../../../.storybook/withMcpView";

/**
 * Stories for the course-search View (mcp-use v2).
 *
 * Seeding mechanism: the shared `.storybook/withMcpView` decorator wraps each
 * story in the seed context consumed by the webpack-aliased
 * `.storybook/mocks/mcp-use-react.ts` module (the real v2 hooks require the
 * module-private bootstrapView runtime that only exists inside an MCP Apps
 * host, so Storybook runs against seeded implementations instead).
 */

const sampleResults = {
  results: [
    {
      id: "c1",
      code: "ACC101",
      name: "Financial Accounting",
      creditUnits: 3,
      sections: [
        {
          classId: "cl1",
          section: "G1",
          professorName: "Prof Lim",
          timings: [
            { dayOfWeek: "MON", startTime: "10:00", endTime: "12:00", venue: "SR 3-1" },
          ],
        },
        { classId: "cl2", section: "G2", professorName: null, timings: [] },
      ],
    },
    { id: "c2", code: "ACC102", name: "Managerial Accounting", creditUnits: 3, sections: [] },
    { id: "c3", code: "COR-STAT1202", name: "Intro Statistics", creditUnits: 1, sections: [] },
  ],
};

const meta: Meta<typeof View> = {
  title: "MCP Views/course-search",
  component: View,
};

export default meta;
type Story = StoryObj<typeof View>;

export const Default: Story = {
  decorators: [
    withMcpView({
      status: "ready",
      toolInput: { query: "ACC" },
      toolOutput: sampleResults,
    }),
  ],
};

export const Dark: Story = {
  decorators: [
    withMcpView({
      status: "ready",
      toolInput: { query: "ACC" },
      toolOutput: sampleResults,
      theme: "dark",
    }),
  ],
};

export const Loading: Story = {
  decorators: [
    withMcpView({ status: "pending", toolInput: { query: "ACC" } }),
  ],
};

export const NoResults: Story = {
  decorators: [
    withMcpView({
      status: "ready",
      toolInput: { query: "ZZZ" },
      toolOutput: { results: [] },
    }),
  ],
};

export const ErrorState: Story = {
  decorators: [
    withMcpView({
      status: "error",
      toolInput: { query: "ACC" },
      error: { message: "Unauthorized" },
    }),
  ],
};
