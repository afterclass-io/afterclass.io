import { tv, type VariantProps } from "tailwind-variants";

export const buttonIconTheme = tv(
  {
    variants: {
      variant: {
        primary: ["text-text-on-primary"],
        secondary: ["text-text-on-secondary"],
        tertiary: ["text-text-on-tertiary"],
        success: ["text-text-on-primary"],
        danger: ["text-text-on-primary"],
      },
      size: {
        sm: ["h-3", "w-3"],
        md: ["h-4", "w-4"],
      },
      iconOnly: {
        true: ["h-5", "w-5"],
      },
    },
  },
  { responsiveVariants: true },
);

export const buttonTheme = tv(
  {
    base: [
      "relative",
      "flex",
      "w-fit",
      "leading-none",
      "text-center",
      "justify-center",
      "items-center",
      "font-semibold",
      "focus-ring",
      "after:transition-all",
      "after:duration-100",
      "after:inset-0",
      "after:absolute",
      "hover:after:bg-white/[0.12]",
      "active:after:bg-transparent",
      "border",
      "border-transparent",
      "data-[disabled]:border-transparent",
      "data-[disabled]:after:bg-transparent",
      "data-[disabled]:text-text-placeholder",
      "disabled:border-transparent",
      "disabled:after:bg-transparent",
      "disabled:text-text-placeholder",
      "disabled:cursor-not-allowed",
    ],
    variants: {
      variant: {
        primary: [
          "bg-primary-default",
          "border-border-primary",
          "text-text-on-primary",
          "disabled:bg-element-disabled",
          "data-[disabled]:bg-element-disabled",
        ],
        secondary: [
          "bg-element-secondary",
          "border-border-secondary",
          "text-text-on-secondary",
          "disabled:bg-element-disabled",
          "data-[disabled]:bg-element-disabled",
        ],
        tertiary: [
          "bg-element-tertiary",
          "border-border-default",
          "text-text-on-tertiary",
          "disabled:bg-element-disabled",
          "data-[disabled]:bg-element-disabled",
        ],
        ghost: [
          "bg-transparent",
          "border-transparent",
          "text-text-on-tertiary",
          "disabled:bg-element-disabled",
          "data-[disabled]:bg-element-disabled",
          "hover:bg-element-tertiary",
        ],
        link: [
          "text-primary-default",
          "hover:underline",
          "hover:after:bg-transparent",
          "disabled:text-text-placeholder",
          "data-[disabled]:text-text-placeholder",
        ],
        success: [
          "bg-green-600",
          "text-text-on-primary",
          "disabled:bg-element-disabled",
          "data-[disabled]:bg-element-disabled",
        ],
        danger: [
          "bg-red-600",
          "text-text-on-primary",
          "disabled:bg-element-disabled",
          "data-[disabled]:bg-element-disabled",
        ],
      },
      size: {
        md: [
          "h-10",
          "px-4",
          "gap-1.5",
          "text-base",
          "rounded-xl",
          "after:rounded-lg",
        ],
        sm: [
          "h-8",
          "px-3",
          "gap-1.5",
          "text-xs",
          "rounded-lg",
          "after:rounded",
        ],
      },
      iconOnly: {
        true: ["h-fit"],
      },
      fullWidth: {
        true: "w-full",
      },
      loading: {
        true: [
          "loading",
          "hover:after:bg-transparent",
          "[&>*:not(.loading)]:invisible",
        ],
      },
      rounded: {
        true: ["rounded-full", "after:rounded-full"],
      },
    },
    compoundVariants: [
      {
        size: "md",
        iconOnly: true,
        className: "w-10 h-10 px-0",
      },
      {
        size: "sm",
        iconOnly: true,
        className: "w-8 h-8 px-0",
      },
      {
        variant: "link",
        size: "md",
        className: "px-0",
      },
      {
        variant: "link",
        size: "sm",
        className: "px-0",
      },
      {
        variant: "ghost",
        loading: true,
        className: "hover:bg-transparent",
      },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
  {
    responsiveVariants: true,
  },
);

export type ButtonVariants = VariantProps<typeof buttonTheme>;
