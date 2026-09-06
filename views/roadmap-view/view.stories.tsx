import type { Meta, StoryObj } from "@storybook/react";
import View from "./view";
import { withMcpView } from "../../.storybook/withMcpView";

/**
 * Stories for the roadmap-view View (mcp-use v2).
 *
 * Seeding mechanism: the shared `.storybook/withMcpView` decorator wraps each
 * story in the seed context consumed by the webpack-aliased
 * `.storybook/mocks/mcp-use-react.ts` module (the real v2 hooks require the
 * module-private bootstrapView runtime that only exists inside an MCP Apps
 * host, so Storybook runs against seeded implementations instead).
 */

const publicProps = {
  roadmapId: "r1",
  name: "BSc IS (Community)",
  isPublic: true,
  owner: "senior123",
  voteCount: 42,
  entries: [
    {
      yearNumber: 1,
      term: "T1",
      courseCode: "COR-IS1702",
      courseName: "Computational Thinking",
      creditUnits: 1,
    },
    {
      yearNumber: 1,
      term: "T2",
      courseCode: "ACCT102",
      courseName: "Management Accounting",
      creditUnits: 1,
    },
    {
      yearNumber: 2,
      term: "T1",
      courseCode: "STAT203",
      courseName: "Financial Mathematics",
      creditUnits: 1,
    },
  ],
};

const privateProps = {
  roadmapId: "r2",
  name: "My Plan",
  isPublic: false,
  owner: null,
  voteCount: null,
  entries: publicProps.entries,
};

const meta: Meta<typeof View> = {
  title: "MCP Views/roadmap-view",
  component: View,
};

export default meta;
type Story = StoryObj<typeof View>;

export const Default: Story = {
  decorators: [withMcpView({ status: "ready", toolOutput: publicProps })],
};

export const Dark: Story = {
  decorators: [
    withMcpView({ status: "ready", toolOutput: publicProps, theme: "dark" }),
  ],
};

export const Private: Story = {
  decorators: [withMcpView({ status: "ready", toolOutput: privateProps })],
};

// Nullable entry + anonymous public roadmap: creditUnits:null drops the CU
// badge; owner/voteCount:null drop the byline while the copy CTA stays.
const nullableBranchesProps = {
  ...publicProps,
  owner: null,
  voteCount: null,
  entries: [
    {
      yearNumber: 1,
      term: "T1",
      courseCode: "COR-IS1702",
      courseName: "Computational Thinking",
      creditUnits: null,
    },
    ...publicProps.entries.slice(1),
  ],
};

export const NullableBranches: Story = {
  decorators: [
    withMcpView({ status: "ready", toolOutput: nullableBranchesProps }),
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

export const WithProgress: Story = {
  decorators: [
    withMcpView({
      status: "ready",
      toolOutput: {
        roadmapId: "r2",
        name: "My Plan",
        isPublic: false,
        owner: null,
        voteCount: null,
        progress: { completed: 3, total: 10 },
        entries: [
          {
            yearNumber: 1,
            term: "T1",
            courseCode: "STAT203",
            courseName: "Financial Mathematics",
            creditUnits: 1,
          },
          {
            yearNumber: 1,
            term: "T1",
            courseCode: "ACCT102",
            courseName: "Management Accounting",
            creditUnits: 1,
          },
          {
            yearNumber: 1,
            term: "T1",
            courseCode: "IS215",
            courseName: "Digital Business - Technologies and Transformation",
            creditUnits: 1,
          },
        ],
      },
    }),
  ],
};
