import type { Meta, StoryObj } from "@storybook/nextjs";
import { TrendChart } from "./TrendChart";
import { TOKENS } from "../tokens";
import { buildChartPoints } from "../utils/chart-points";

const manyTerms = buildChartPoints([
  { acadTermId: "AY2023/24-T1", round: "1", window: 1, min: 8, median: 18 },
  { acadTermId: "AY2024/25-T1", round: "1", window: 1, min: 10, median: 22 },
  { acadTermId: "AY2024/25-T1", round: "1A", window: 2, min: 12, median: 25 },
  { acadTermId: "AY2025/26-T1", round: "1", window: 1, min: 14, median: 28 },
  { acadTermId: "AY2026/27-T1", round: "1", window: 1, min: 16, median: 32 },
]);

const meta: Meta<typeof TrendChart> = {
  title: "MCP Views/shared/TrendChart",
  component: TrendChart,
};

export default meta;
type Story = StoryObj<typeof TrendChart>;

export const ManyTerms: Story = {
  args: {
    points: manyTerms,
    currentKey: manyTerms[manyTerms.length - 1]!.key,
    c: TOKENS.light,
  },
};

export const Dark: Story = {
  args: { points: manyTerms, currentKey: null, c: TOKENS.dark },
};
