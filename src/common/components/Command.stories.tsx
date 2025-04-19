import type { Meta, StoryObj } from "@storybook/react";

import {
  BookLineIcon,
  CheckIcon,
  DealsIcon,
  EnvelopeIcon,
  LockIcon,
  StarLineAltIcon,
} from "@/common/components/CustomIcon";
import { Command } from "./Command";
import { useEffect, useState } from "react";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/Command",
  component: Command,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: { as: "dialog" },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Command>
      <Command.Input placeholder="Type a command or search..." />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>
        <Command.Group heading="Suggestions">
          <Command.Item>
            <BookLineIcon className="mr-2 h-4 w-4" />
            <span>Calendar</span>
          </Command.Item>
          <Command.Item>
            <CheckIcon className="mr-2 h-4 w-4" />
            <span>Search Emoji</span>
          </Command.Item>
          <Command.Item>
            <DealsIcon className="mr-2 h-4 w-4" />
            <span>Calculator</span>
          </Command.Item>
        </Command.Group>
        <Command.Separator />
        <Command.Group heading="Settings">
          <Command.Item>
            <EnvelopeIcon className="mr-2 h-4 w-4" />
            <span>Profile</span>
            <Command.Shortcut>⌘P</Command.Shortcut>
          </Command.Item>
          <Command.Item>
            <LockIcon className="mr-2 h-4 w-4" />
            <span>Billing</span>
            <Command.Shortcut>⌘B</Command.Shortcut>
          </Command.Item>
          <Command.Item>
            <StarLineAltIcon className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <Command.Shortcut>⌘S</Command.Shortcut>
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command>
  ),
};

export const CommandDialog: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [open, setOpen] = useState(false);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const down = (e: KeyboardEvent) => {
        if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          setOpen((open) => !open);
        }
      };
      document.addEventListener("keydown", down);
      return () => document.removeEventListener("keydown", down);
    }, []);
    return (
      <>
        <div className="flex gap-2 text-sm">
          <span>Press</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border px-1.5 font-mono text-base font-medium opacity-100">
            <span>⌘</span>J
          </kbd>
        </div>
        <Command as="dialog" open={open} onOpenChange={setOpen}>
          <Command.Input placeholder="Type a command or search..." autoFocus />
          <Command.List>
            <Command.Empty>No results found.</Command.Empty>
            <Command.Group heading="Suggestions">
              <Command.Item>
                <BookLineIcon className="mr-2 h-4 w-4" />
                <span>Calendar</span>
              </Command.Item>
              <Command.Item>
                <CheckIcon className="mr-2 h-4 w-4" />
                <span>Search Emoji</span>
              </Command.Item>
              <Command.Item>
                <DealsIcon className="mr-2 h-4 w-4" />
                <span>Calculator</span>
              </Command.Item>
            </Command.Group>
            <Command.Separator />
            <Command.Group heading="Settings">
              <Command.Item>
                <EnvelopeIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
                <Command.Shortcut>⌘P</Command.Shortcut>
              </Command.Item>
              <Command.Item>
                <LockIcon className="mr-2 h-4 w-4" />
                <span>Billing</span>
                <Command.Shortcut>⌘B</Command.Shortcut>
              </Command.Item>
              <Command.Item>
                <StarLineAltIcon className="mr-2 h-4 w-4" />
                <span>Settings</span>
                <Command.Shortcut>⌘S</Command.Shortcut>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </>
    );
  },
};
