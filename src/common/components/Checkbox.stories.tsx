import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox, type CheckedState } from "./Checkbox";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/Checkbox",
  component: Checkbox,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    disabled: {
      description: "If `true`, the checkbox will be disabled.",
      control: {
        type: "boolean",
      },
    },
    checked: {
      description: [
        "If `true`, the checkbox will be checked.",
        "`indeterminate`: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/checkbox#indeterminate_state_checkboxes.",
        "`true | false | indeterminate`",
      ].join("\n\n"),
      options: ["true", "false", "indeterminate"],
      control: {
        type: "select",
      },
    },
  },
  args: {
    label: "default",
    asChild: false,
    disabled: false,
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const VariantsOfDefaultCheckbox: Story = {
  render: () => {
    const [checkedDisabled, setCheckedDisabled] =
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useState<CheckedState>("indeterminate");
    return (
      <div className="flex flex-col gap-3">
        <Checkbox label="default unchecked" />
        <Checkbox label="default checked" defaultChecked />
        <Checkbox
          label="default indeterminate"
          checked={checkedDisabled}
          onCheckedChange={setCheckedDisabled}
        />
      </div>
    );
  },
};

export const VariantsOfDisabledCheckbox: Story = {
  render: () => {
    const [checkedDisabled, setCheckedDisabled] =
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useState<CheckedState>("indeterminate");
    return (
      <div className="flex flex-col gap-3">
        <Checkbox label="disabled unchecked" disabled={true} />
        <Checkbox label="disabled checked" defaultChecked disabled={true} />
        <Checkbox
          label="disabled indeterminate"
          checked={checkedDisabled}
          onCheckedChange={setCheckedDisabled}
          disabled={true}
        />
      </div>
    );
  },
};
