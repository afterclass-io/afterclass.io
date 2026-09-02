import type { Meta, StoryObj } from "@storybook/react";
import View from "./view";
import { withMcpView } from "../../../../.storybook/withMcpView";

/**
 * Stories for the bid-recommendation View (mcp-use v2).
 *
 * Seeding mechanism: the shared `.storybook/withMcpView` decorator wraps each
 * story in the seed context consumed by the webpack-aliased
 * `.storybook/mocks/mcp-use-react.ts` module (the real v2 hooks require the
 * module-private bootstrapView runtime that only exists inside an MCP Apps
 * host, so Storybook runs against seeded implementations instead).
 */

const fullProps = {
  classId: "cl1",
  acadTermId: "AY2026/27-T1",
  bidWindow: { id: 53, round: "1", window: 1 },
  predictedMedian: 25,
  suggestedBidAmount: 26.25,
  multiplierUsed: { beatsPercentage: 70, multiplier: 1.05 },
  rationale:
    "Predicted median 25 x safety multiplier 1.05 (beats 70% of bids).",
};

const minimalProps = {
  classId: "cl2",
  acadTermId: "AY2026/27-T1",
  suggestedBidAmount: 20,
};

const meta: Meta<typeof View> = {
  title: "MCP Views/bid-recommendation",
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

export const Minimal: Story = {
  decorators: [withMcpView({ status: "ready", toolOutput: minimalProps })],
};

export const Loading: Story = {
  decorators: [withMcpView({ status: "pending" })],
};

export const ErrorState: Story = {
  decorators: [
    withMcpView({ status: "error", error: { message: "Unauthorized" } }),
  ],
};
