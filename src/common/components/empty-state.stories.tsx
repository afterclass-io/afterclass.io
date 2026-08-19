import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState } from "./empty-state";
import { Search } from "lucide-react";
import { Button } from "./button";

const meta = {
  title: "Common/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "No items found",
    description: "Try adjusting your search or filters.",
  },
};

export const WithIcon: Story = {
  args: {
    icon: <Search className="h-8 w-8 text-muted-foreground" />,
    title: "No classes added yet",
    description: "Add your first course to get started.",
    action: <Button size="sm">Add your first course</Button>,
  },
};

export const TitleOnly: Story = {
  args: {
    title: "Nothing here yet",
  },
};
