import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import { Combobox, type ComboboxOption } from "./combobox";

const sampleOptions: ComboboxOption[] = [
  { value: "IS111", label: "IS111 Introduction to Programming" },
  { value: "IS216", label: "IS216 Software Engineering" },
  { value: "CS101", label: "CS101 Computer Science Foundation" },
  { value: "COR-STAT1202", label: "COR-STAT1202 Statistical Analysis" },
];

const LONG_LABEL = "IS999 Advanced Topics in Extremely Long Course Names Here";

function InteractiveCombobox(props: React.ComponentProps<typeof Combobox>) {
  const [val, setVal] = useState<ComboboxOption | null>(props.value ?? null);
  const [q, setQ] = useState(props.query ?? "");

  return (
    <Combobox
      {...props}
      value={val}
      onValueChange={setVal}
      query={q}
      onQueryChange={setQ}
    />
  );
}

const meta = {
  id: "common-shared-combobox",
  title: "Common/Combobox",
  component: Combobox,
  tags: ["autodocs"],
  args: {
    options: sampleOptions,
    placeholder: "Filter for a Course...",
    triggerLabel: "Select a Course",
    query: "",
    onQueryChange: () => undefined,
    value: null,
    onValueChange: () => undefined,
  },
  render: (args) => <InteractiveCombobox {...args} />,
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSelection: Story = {
  args: {
    value: sampleOptions[1] ?? null,
  },
};

export const Loading: Story = {
  args: {
    isFetching: true,
  },
};

export const Stale: Story = {
  args: {
    isStale: true,
    query: "IS",
  },
};

export const Empty: Story = {
  args: {
    options: [],
    emptyText: "Nothing found.",
  },
};

export const Idle: Story = {
  args: {
    options: [],
    idle: true,
    hintText: "Type 2 or more characters to find a course.",
  },
};

export const TruncatedTotal: Story = {
  args: {
    total: 42,
  },
};

export const LongLabelEqualWidth: Story = {
  render: (args) => (
    <div className="grid w-160 grid-cols-2 gap-4">
      <InteractiveCombobox
        {...args}
        value={{ value: "LONG1", label: LONG_LABEL }}
      />
      <InteractiveCombobox
        {...args}
        value={{ value: "LONG2", label: LONG_LABEL }}
      />
    </div>
  ),
};
