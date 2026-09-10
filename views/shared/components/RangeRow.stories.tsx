import type { Meta, StoryObj } from "@storybook/nextjs";
import { RangeRow } from "./RangeRow";
import { TOKENS } from "../tokens";

const meta: Meta<typeof RangeRow> = {
  title: "MCP Views/shared/RangeRow",
  component: RangeRow,
};

export default meta;
type Story = StoryObj<typeof RangeRow>;

export const Solid: Story = {
  args: { label: "History", min: 10, median: 22, max: 50, c: TOKENS.light },
};

export const Dashed: Story = {
  args: {
    label: "Predicted",
    min: 18,
    median: 30,
    max: 50,
    dashed: true,
    c: TOKENS.light,
  },
};

export const Dark: Story = {
  args: {
    label: "Predicted",
    min: 18,
    median: 30,
    max: 50,
    dashed: true,
    c: TOKENS.dark,
  },
};
