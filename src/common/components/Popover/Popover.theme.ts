import { type VariantProps, tv } from "tailwind-variants";

export type PopoverVariants = VariantProps<typeof popoverTheme>;

export const popoverTheme = tv(
  {
    base: [
      "bg-surface-base",
      "z-popover",
      "w-screen", // Required to make popover full width on mobile
      "max-w-[320px]",
      "min-w-0",
      "rounded-xl",
      "py-5",
      "px-5",
      "border",
      "border-border-default",
      "shadow-md",
      "outline-hidden",
      "text-text-em-high",
      "data-[state=open]:animate-in",
      "data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0",
      "data-[state=open]:fade-in-0",
      "data-[state=closed]:zoom-out-95",
      "data-[state=open]:zoom-in-95",
      "data-[side=bottom]:slide-in-from-top-2",
      "data-[side=left]:slide-in-from-right-2",
      "data-[side=right]:slide-in-from-left-2",
      "data-[side=top]:slide-in-from-bottom-2",
    ],
    variants: {
      variant: {
        combobox: ["max-h-60", "max-w-[400px]", "px-0", "py-0", "flex"],
      },
    },
  },
  { responsiveVariants: true },
);
