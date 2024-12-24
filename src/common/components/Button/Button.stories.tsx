import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "./Button";
import PhStar from "~icons/ph/star";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/Button",
  component: Button,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    fullWidth: {
      control: {
        type: "boolean",
      },
    },
    loading: {
      control: {
        type: "boolean",
      },
    },
    rounded: {
      control: {
        type: "boolean",
      },
    },
  },
  args: {
    variant: "primary",
    size: "md",
    children: "primary",
    as: "a",
    href: "https://example.com",
    external: true,
    loading: false,
    isResponsive: false,
    fullWidth: false,
    rounded: false,
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
const VariantsOfButtonTemplate: Story = {
  render: ({ variant }) => (
    <div className="flex max-w-[320px] flex-wrap gap-3">
      <Button variant={variant}>{variant as string}</Button>
      <Button variant={variant} size="sm" iconLeft={<PhStar />}>
        Small
      </Button>
      <Button variant={variant} aria-label="star" iconLeft={<PhStar />} />
      <Button
        variant={variant}
        size="sm"
        aria-label="star"
        iconLeft={<PhStar />}
      />
      <Button variant={variant} loading>
        {variant as string}
      </Button>
      <Button variant={variant} size="sm" iconLeft={<PhStar />} loading>
        Small
      </Button>
      <Button
        variant={variant}
        aria-label="star"
        iconLeft={<PhStar />}
        loading
      />
      <Button
        variant={variant}
        size="sm"
        aria-label="star"
        iconLeft={<PhStar />}
        loading
      />
      <Button variant={variant} disabled>
        {variant as string}
      </Button>
      <Button variant={variant} size="sm" iconLeft={<PhStar />} disabled>
        Small
      </Button>
      <Button
        variant={variant}
        aria-label="star"
        iconLeft={<PhStar />}
        disabled
      />
      <Button
        variant={variant}
        size="sm"
        aria-label="star"
        iconLeft={<PhStar />}
        disabled
      />
    </div>
  ),
};

export const VariantsOfPrimary: Story = {
  ...VariantsOfButtonTemplate,
  args: {
    variant: "primary",
  },
};

export const VariantsOfSecondary: Story = {
  ...VariantsOfButtonTemplate,
  args: {
    variant: "secondary",
  },
};

export const VariantsOfTertiary: Story = {
  ...VariantsOfButtonTemplate,
  args: {
    variant: "tertiary",
  },
};

export const VariantsOfSuccess: Story = {
  ...VariantsOfButtonTemplate,
  args: {
    variant: "success",
  },
};

export const VariantsOfDanger: Story = {
  ...VariantsOfButtonTemplate,
  args: {
    variant: "danger",
  },
};

export const VariantsOfGhost: Story = {
  ...VariantsOfButtonTemplate,
  args: {
    variant: "ghost",
  },
};

export const VariantsOfLink: Story = {
  ...VariantsOfButtonTemplate,
  args: {
    variant: "link",
  },
};
