import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import type { IsoDateRange } from "@/common/functions/term-date-bounds";
import { DateRangePicker } from "./date-range-picker";

const meta = {
  title: "Common/DateRangePicker",
  component: DateRangePicker,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    value: { start: "2026-10-12", end: "2026-10-16" },
    onChange: () => undefined,
  },
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Bounded to a term window, capped at 14 days, with length shortcuts in the footer.
 * Days outside the bounds are disabled.
 */
export const TermBounded: Story = {
  render: function Render(args) {
    const [range, setRange] = useState<IsoDateRange>(args.value);
    return (
      <DateRangePicker
        {...args}
        value={range}
        onChange={setRange}
        min="2026-08-17"
        max="2026-12-06"
        maxDays={14}
        presets={[3, 5, 7, 14]}
      />
    );
  },
};

export const SingleDay: Story = {
  args: { value: { start: "2026-10-12", end: "2026-10-12" } },
};

export const Disabled: Story = {
  args: { disabled: true },
};
