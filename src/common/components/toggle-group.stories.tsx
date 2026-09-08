import type { Meta, StoryObj } from "@storybook/nextjs";
import { GitBranch, LayoutGrid } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/ToggleGroup",
  component: ToggleGroup,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {
    type: "single",
    disabled: false,
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    console.log(args);
    return (
      <ToggleGroup {...args}>
        <ToggleGroupItem value="down" aria-label="Toggle down">
          Down
        </ToggleGroupItem>
        <ToggleGroupItem value="check" aria-label="Toggle check">
          Check
        </ToggleGroupItem>
        <ToggleGroupItem value="lock" aria-label="Toggle lock">
          Lock
        </ToggleGroupItem>
      </ToggleGroup>
    );
  },
};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Multiple: Story = {
  ...Default,
  args: {
    type: "multiple",
  },
};

export const Small: Story = {
  ...Default,
  args: {
    ...Default.args,
    size: "sm",
  },
};

export const Disabled: Story = {
  ...Default,
  args: {
    ...Default.args,
    disabled: true,
  },
};

/**
 * Segmented control with icon + unequal label widths (mirrors the roadmap
 * Grid/Timeline toggle). Regression: items must keep even padding on all
 * sides — the wider label must not squeeze its icon/text against the item
 * borders.
 */
export const Segmented: Story = {
  render: () => (
    <ToggleGroup
      type="single"
      variant="segmented"
      size="sm"
      defaultValue="grid"
    >
      <ToggleGroupItem value="grid" aria-label="Grid view">
        <LayoutGrid className="size-4 shrink-0" />
        <span>Grid</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="timeline" aria-label="Timeline view">
        <GitBranch className="size-4 shrink-0" />
        <span>Timeline</span>
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};
