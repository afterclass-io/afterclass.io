import type { Meta, StoryObj } from "@storybook/react";
import { InlineNotesEditor } from "./InlineNotesEditor";

const meta: Meta<typeof InlineNotesEditor> = {
  title: "Timetable/InlineNotesEditor",
  component: InlineNotesEditor,
  tags: ["autodocs"],
  args: {
    initialNotes: "",
    disabled: false,
    onSave: async () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithNotes: Story = {
  args: {
    initialNotes: "Bid higher in window 2",
  },
};

export const Empty: Story = {
  args: {
    initialNotes: "",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
