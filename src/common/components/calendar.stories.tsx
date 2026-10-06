import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";
import { Calendar, type DateRange } from "./calendar";

const meta = {
  title: "Common/Calendar",
  component: Calendar,
  tags: ["autodocs"],
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  render: function Render(args) {
    const [selected, setSelected] = useState<Date | undefined>(
      new Date(2026, 9, 12),
    );
    return (
      <Calendar
        {...args}
        mode="single"
        selected={selected}
        onSelect={setSelected}
        defaultMonth={new Date(2026, 9)}
        className="rounded-md border"
      />
    );
  },
};

export const Range: Story = {
  render: function Render(args) {
    const [selected, setSelected] = useState<DateRange | undefined>({
      from: new Date(2026, 9, 12),
      to: new Date(2026, 9, 16),
    });
    return (
      <Calendar
        {...args}
        mode="range"
        selected={selected}
        onSelect={setSelected}
        defaultMonth={new Date(2026, 9)}
        className="rounded-md border"
      />
    );
  },
};

export const DisabledOutsideBounds: Story = {
  render: function Render(args) {
    const [selected, setSelected] = useState<Date | undefined>();
    return (
      <Calendar
        {...args}
        mode="single"
        selected={selected}
        onSelect={setSelected}
        defaultMonth={new Date(2026, 9)}
        disabled={[{ before: new Date(2026, 9, 5) }, { after: new Date(2026, 9, 25) }]}
        className="rounded-md border"
      />
    );
  },
};
