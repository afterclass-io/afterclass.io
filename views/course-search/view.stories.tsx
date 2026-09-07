import type { Meta, StoryObj } from "@storybook/react";
import View from "./view";
import { withMcpView } from "../../.storybook/withMcpView";

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
      code: "IS215",
      name: "Digital Business - Technologies and Transformation",
      creditUnits: 4,
      description:
        "This course introduces students to the fundamentals of digital business, technologies and the principles and practices that lead to successful digital transformation.",
      sections: [
        {
          classId: "seed-ay202627t1-is215-g1",
          section: "G1",
          professorName: "Yixin CAO",
          timings: [
            {
              dayOfWeek: "Mon",
              startTime: "08:15",
              endTime: "11:30",
              venue: "SOE/SCIS2 Seminar Room 2-1",
            },
          ],
        },
        {
          classId: "seed-ay202627t1-is215-g2",
          section: "G2",
          professorName: null,
          timings: [],
        },
      ],
    },
    {
      id: "c2",
      code: "ACCT102",
      name: "Management Accounting",
      creditUnits: 4,
      sections: [],
    },
    {
      id: "c3",
      code: "COR-IS1702",
      name: "Computational Thinking",
      creditUnits: 4,
      sections: [],
    },
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
      toolInput: { query: "IS215" },
      toolOutput: sampleResults,
    }),
  ],
};

export const Dark: Story = {
  decorators: [
    withMcpView({
      status: "ready",
      toolInput: { query: "IS215" },
      toolOutput: sampleResults,
      theme: "dark",
    }),
  ],
};

export const Loading: Story = {
  decorators: [
    withMcpView({ status: "pending", toolInput: { query: "IS215" } }),
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
      toolInput: { query: "IS215" },
      error: { message: "Unauthorized" },
    }),
  ],
};

/**
 * Exercises the unavailable-host path: the bridge cannot call tools, so the
 * "Add to timetable" CTA must stay hidden (see view.tsx `isAvailable` guard).
 */
export const UnavailableHost: Story = {
  decorators: [
    withMcpView({
      status: "ready",
      toolInput: { query: "IS215" },
      toolOutput: sampleResults,
      isAvailable: false,
    }),
  ],
};

export const WithDescriptions: Story = {
  decorators: [
    withMcpView({
      status: "ready",
      toolInput: { query: "business" },
      toolOutput: {
        results: [
          {
            id: "c1",
            code: "IS215",
            name: "Digital Business - Technologies and Transformation",
            creditUnits: 4,
            description:
              "This course introduces students to the fundamentals of digital business, technologies and the principles and practices that lead to successful digital transformation.",
            sections: [],
          },
          {
            id: "c3",
            code: "COR-IS1702",
            name: "Computational Thinking",
            creditUnits: 4,
            sections: [],
          },
        ],
      },
    }),
  ],
};

/**
 * AddClassFailure: the add-class-to-timetable CTA's callTool rejected
 * (rate-limited) — exercises the per-row "Failed" feedback via the
 * injectable useDynamicTool mock (`parameters.mcpCta`).
 */
export const AddClassFailure: Story = {
  decorators: [
    withMcpView({
      status: "ready",
      toolInput: { query: "IS215" },
      toolOutput: sampleResults,
    }),
  ],
  parameters: { mcpCta: { mode: "error", message: "rate limited" } },
};

/**
 * AddClassPending: the add-class-to-timetable CTA's callTool never settles
 * — exercises the mock's pending mode via `parameters.mcpCta`. No button
 * label changes (course-search has no pending-aware button); the story pins
 * the seed wiring so the mode stays covered.
 */
export const AddClassPending: Story = {
  decorators: [
    withMcpView({
      status: "ready",
      toolInput: { query: "IS215" },
      toolOutput: sampleResults,
    }),
  ],
  parameters: { mcpCta: { mode: "pending" } },
};
