import type { Meta, StoryObj } from "@storybook/react";
import { HistoryTable } from "./HistoryTable";
import { TOKENS } from "../tokens";
import { buildChartPoints } from "../utils/chart-points";

const points = buildChartPoints([
  { acadTermId: "AY2024/25-T1", round: "1", window: 1, min: 10, median: 22 },
  { acadTermId: "AY2024/25-T1", round: "1A", window: 2, min: 12, median: 25 },
  { acadTermId: "AY2025/26-T1", round: "1", window: 1, min: 14, median: 28 },
]);

const meta: Meta<typeof HistoryTable> = {
  title: "MCP Views/shared/HistoryTable",
  component: HistoryTable,
};

export default meta;
type Story = StoryObj<typeof HistoryTable>;

export const Default: Story = {
  args: { points, c: TOKENS.light },
};

export const Dark: Story = {
  args: { points, c: TOKENS.dark },
};
