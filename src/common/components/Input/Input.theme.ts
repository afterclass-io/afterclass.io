import { type VariantProps, tv } from "tailwind-variants";

export type InputVariants = VariantProps<typeof inputTheme>;

export const inputTheme = tv(
  {
    slots: {
      wrapper: [
        "bg-surface-base",
        "border",
        "border-border-default",
        "rounded-lg",
        "flex",
        "items-center",
        "focus-ring",
      ],
      input: [
        "bg-transparent",
        "outline-hidden",
        "placeholder:text-text-em-low",
        "flex-1",
        "disabled:cursor-not-allowed",
      ],
    },
    variants: {
      size: {
        md: {
          wrapper: ["h-[44px]", "px-3", "gap-2.5"],
          input: ["text-base"],
        },
        sm: {
          wrapper: ["h-8", "px-2", "gap-1.5"],
          input: ["text-sm"],
        },
      },
    },
  },
  { responsiveVariants: true },
);
