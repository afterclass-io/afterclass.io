import type { Meta, StoryObj } from "@storybook/react";
import View from "./view";
import { withMcpView } from "../../.storybook/withMcpView";

/**
 * Stories for the bid-explorer View (mcp-use v2).
 *
 * Seeding mechanism: the shared `.storybook/withMcpView` decorator wraps each
 * story in the seed context consumed by the webpack-aliased
 * `.storybook/mocks/mcp-use-react.ts` module (the real v2 hooks require the
 * module-private bootstrapView runtime that only exists inside an MCP Apps
 * host, so Storybook runs against seeded implementations instead).
 */

// Safety factors mirror the real seed data
// (`prisma/data/22_safety_factors.json`, EMPIRICAL/MEDIAN):
// 50/60/70/80/90/95 with ascending multipliers. The
// explore-bid-options tool filters to the prediction term's MEDIAN
// factors, so fixtures carry all six rates.
const fullProps = {
  classId: "cl1",
  history: [
    {
      acadTermId: "AY2024/25-T1",
      round: "1",
      window: 1,
      min: 10,
      median: 22,
      vacancy: 45,
    },
    {
      acadTermId: "AY2025/26-T1",
      round: "1",
      window: 1,
      min: 14,
      median: 28,
      vacancy: 40,
    },
  ],
  prediction: {
    medianPredicted: 30,
    minPredicted: 18,
    bidWindow: { id: 53, round: "1", window: 1 },
  },
  safetyFactors: [
    { beatsPercentage: 50, multiplier: 0 },
    { beatsPercentage: 60, multiplier: 0.25 },
    { beatsPercentage: 70, multiplier: 0.54 },
    { beatsPercentage: 80, multiplier: 0.88 },
    { beatsPercentage: 90, multiplier: 1.37 },
    { beatsPercentage: 95, multiplier: 1.81 },
  ],
};

const historyOnlyProps = {
  classId: null,
  history: fullProps.history,
  prediction: null,
  safetyFactors: [],
};

// Multi-round history exercises the Task 9 trend chart,
// round/window filters, and sortable history table.
const multiRoundProps = {
  ...fullProps,
  history: [
    {
      acadTermId: "AY2024/25-T1",
      round: "1",
      window: 1,
      min: 10,
      median: 22,
      vacancy: 45,
    },
    {
      acadTermId: "AY2024/25-T1",
      round: "1A",
      window: 2,
      min: 12,
      median: 25,
      vacancy: 40,
    },
    {
      acadTermId: "AY2025/26-T1",
      round: "1",
      window: 1,
      min: 14,
      median: 28,
      vacancy: 38,
    },
  ],
};

// Four history terms exercise the staggered x-axis labels (>2
// points get alternating two-row labels plus shortened
// "25/26-T1" forms).
const manyTermsProps = {
  ...fullProps,
  history: [
    {
      acadTermId: "AY2023/24-T1",
      round: "1",
      window: 1,
      min: 12.24,
      median: 18,
      vacancy: 50,
    },
    {
      acadTermId: "AY2024/25-T1",
      round: "1",
      window: 1,
      min: 10,
      median: 22,
      vacancy: 45,
    },
    {
      acadTermId: "AY2024/25-T1",
      round: "1A",
      window: 2,
      min: 12,
      median: 25,
      vacancy: 40,
    },
    {
      acadTermId: "AY2025/26-T1",
      round: "1",
      window: 1,
      min: 14,
      median: 28,
      vacancy: 38,
    },
    {
      acadTermId: "AY2026/27-T1",
      round: "1",
      window: 1,
      min: 16,
      median: 32,
      vacancy: 36,
    },
  ],
};

const meta: Meta<typeof View> = {
  title: "MCP Views/bid-explorer",
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

export const HistoryOnly: Story = {
  decorators: [withMcpView({ status: "ready", toolOutput: historyOnlyProps })],
};

/** Zero history + null prediction: the fully-empty state. */
export const Empty: Story = {
  decorators: [
    withMcpView({
      status: "ready",
      toolOutput: {
        classId: null,
        history: [],
        prediction: null,
        safetyFactors: [],
      },
    }),
  ],
};

export const MultiRound: Story = {
  decorators: [withMcpView({ status: "ready", toolOutput: multiRoundProps })],
};

export const ManyTerms: Story = {
  decorators: [withMcpView({ status: "ready", toolOutput: manyTermsProps })],
};

// Nullable branches at view level: history rows carry vacancy:null (the tool
// passes vacancy through; the View ignores it) and the prediction carries
// minPredicted:null (median-only suggestion, no en-dash range).
const nullableBranchesProps = {
  ...fullProps,
  history: fullProps.history.map((h) => ({ ...h, vacancy: null })),
  prediction: { ...fullProps.prediction, minPredicted: null },
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
