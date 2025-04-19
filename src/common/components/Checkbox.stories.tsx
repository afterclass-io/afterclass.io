import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox, type CheckedState } from "./checkbox";

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
        <div className="items-top flex space-x-2">
          <Checkbox id="terms1" />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="terms1"
              className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              default unchecked
            </label>
          </div>
        </div>
        <div className="items-top flex space-x-2">
          <Checkbox id="terms1" defaultChecked />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="terms1"
              className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              default checked
            </label>
          </div>
        </div>
        <div className="items-top flex space-x-2">
          <Checkbox
            id="terms1"
            checked={checkedDisabled}
            onCheckedChange={setCheckedDisabled}
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="terms1"
              className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              default indeterminate
            </label>
          </div>
        </div>
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
        <div className="items-top flex space-x-2">
          <Checkbox id="terms1" disabled />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="terms1"
              className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              disabled unchecked
            </label>
          </div>
        </div>
        <div className="items-top flex space-x-2">
          <Checkbox id="terms1" disabled defaultChecked />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="terms1"
              className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              disabled checked
            </label>
          </div>
        </div>
        <div className="items-top flex space-x-2">
          <Checkbox
            id="terms1"
            checked={checkedDisabled}
            onCheckedChange={setCheckedDisabled}
            disabled
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="terms1"
              className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              disabled indeterminate
            </label>
          </div>
        </div>
      </div>
    );
  },
};
