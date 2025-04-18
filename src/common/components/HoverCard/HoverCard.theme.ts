import { type VariantProps, tv } from "tailwind-variants";

export type HoverCardVariants = VariantProps<typeof hoverCardTheme>;

export const hoverCardTheme = tv(
  {
    base: [
      "bg-surface-base",
      "text-text-em-high",
      "z-popover",
      "w-64",
      "rounded-md",
      "border",
      "border-border-default",
      "p-4",
      "shadow-md",
      "outline-none",
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
    variants: {},
  },
  { responsiveVariants: true },
);
