import type { Meta, StoryObj } from "@storybook/react";
import View from "./view";
import { withMcpView } from "../../.storybook/withMcpView";

/**
 * Stories for the bid-plan View (mcp-use v2).
 *
 * Seeding mechanism: the shared `.storybook/withMcpView` decorator wraps each
 * story in the seed context consumed by the webpack-aliased
 * `.storybook/mocks/mcp-use-react.ts` module (the real v2 hooks require the
 * module-private bootstrapView runtime that only exists inside an MCP Apps
 * host, so Storybook runs against seeded implementations instead).
 */

const fullProps = {
  acadTermId: "AY202627T1",
  budget: { balance: 987.5 },
  bids: [
    {
      id: "b1",
      bidAmount: 25,
      status: "PLANNED",
      courseCode: "ACCT102",
      courseName: "Management Accounting",
      section: "G1",
      professorName: "FANG Bingxu",
      round: "1",
      window: 1,
    },
    {
      id: "b2",
      bidAmount: 51,
      status: "SECURED",
      courseCode: "CS301",
      courseName: "IT Solution Architecture",
      section: "G3",
      professorName: null,
      round: "1A",
      window: 2,
    },
  ],
};

const meta: Meta<typeof View> = {
  title: "MCP Views/bid-plan",
  component: View,
};

export default meta;
type Story = StoryObj<typeof View>;

export const Default: Story = {
  decorators: [withMcpView({ status: "ready", toolOutput: fullProps })],
};

export const Dark: Story = {
  decorators: [
    withMcpView({ status: "ready", toolOutput: fullProps, theme: "dark" }),
  ],
};

export const Empty: Story = {
  decorators: [
    withMcpView({
      status: "ready",
      toolOutput: { acadTermId: "AY202627T1", budget: null, bids: [] },
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

// NoBudget vs Empty: Empty (above) has budget:null AND no bids (never
// planned); NoBudget has bids but no budget set — the "set one first"
// nudge path from the plan-bidding prompt (MCP.md inspector matrix).
export const NoBudget: Story = {
  decorators: [
    withMcpView({
      status: "ready",
      toolOutput: {
        acadTermId: "AY202627T1",
        budget: null,
        bids: [
          {
            id: "b1",
            bidAmount: 25,
            status: "PLANNED",
            courseCode: "ACCT102",
            courseName: "Management Accounting",
            section: "G1",
            professorName: "FANG Bingxu",
            round: "1",
            window: 1,
          },
        ],
      },
    }),
  ],
};

// ConfirmRequired: the write path's destructive confirm:true gate rejects
// the first unconfirmed call — surface the gate text, not a bare error.
export const ConfirmRequired: Story = {
  decorators: [
    withMcpView({
      status: "error",
      error: {
        message:
          'Destructive tool "save-bids" requires explicit confirmation: call again with confirm:true after showing the user what will be deleted.',
      },
    }),
  ],
};

// RateLimited: the per-user write budget is exhausted — friendly slow-down,
// not a crash.
export const RateLimited: Story = {
  decorators: [
    withMcpView({
      status: "error",
      error: {
        message:
          "Write rate limit exceeded: at most 60 write operations per minute are allowed. Please wait ~12s before trying again.",
      },
    }),
  ],
};
