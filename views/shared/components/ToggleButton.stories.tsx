import type { Meta, StoryObj } from "@storybook/nextjs";
import { ToggleButton } from "./ToggleButton";
import { TOKENS } from "../tokens";

const meta: Meta<typeof ToggleButton> = {
  title: "MCP Views/shared/ToggleButton",
  component: ToggleButton,
};

export default meta;
type Story = StoryObj<typeof ToggleButton>;

export const Off: Story = {
  args: { label: "1A", pressed: false, c: TOKENS.light },
};

export const On: Story = {
  args: { label: "1A", pressed: true, c: TOKENS.light },
};

export const Dark: Story = {
  args: { label: "W2", pressed: true, c: TOKENS.dark },
};
