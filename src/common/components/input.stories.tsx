import type { Meta, StoryObj } from "@storybook/react";
import {
  InputRoot,
  InputAdornment,
  InputControl,
  Input,
  InputAdornmentButton,
} from "@/common/components/input";
import { StarLineAltIcon } from "@/common/components/icons";
import { Label } from "@/common/components/label";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/common/components/tooltip";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/Input",
  component: Input,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {},
  args: {
    placeholder: "email",
    type: "email",
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    placeholder: "email",
    type: "email",
    disabled: true,
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input type="email" id="email" placeholder="Email" />
    </div>
  ),
};

export const WithButton: Story = {
  render: () => (
    <div className="flex w-full max-w-sm items-center space-x-2">
      <InputRoot>
        <InputAdornment>
          <StarLineAltIcon />
        </InputAdornment>
        <InputControl>
          <Input type="email" placeholder="Email" />
        </InputControl>
        <Tooltip>
          <InputAdornment>
            <InputAdornmentButton asChild>
              <TooltipTrigger>
                <Info />
              </TooltipTrigger>
            </InputAdornmentButton>
          </InputAdornment>
          <TooltipContent>
            <p>Email must be unique.</p>
          </TooltipContent>
        </Tooltip>
      </InputRoot>
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-white">
      <InputRoot>
        <InputAdornment>
          <StarLineAltIcon />
        </InputAdornment>
        <InputControl>
          <Input type="email" placeholder="Email" />
        </InputControl>
      </InputRoot>
    </div>
  ),
};

export const File: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <InputRoot>
        <InputAdornment>
          <StarLineAltIcon />
        </InputAdornment>
        <InputControl>
          <Input type="email" />
        </InputControl>
      </InputRoot>
    </div>
  ),
};
