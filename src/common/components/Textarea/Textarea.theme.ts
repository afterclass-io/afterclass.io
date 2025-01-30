import { type VariantProps, tv } from "tailwind-variants";

export type TextareaVariants = VariantProps<typeof textareaTheme>;

export const textareaTheme = tv(
  {
    slots: {
      wrapper: [],
      textarea: [
        "focus-ring",
        "flex",
        "items-start",
        "p-2",
        "w-80",
        "max-w-[480px]",
        "min-h-32",
        "gap-2",
        "rounded-lg",
        "border",
        "bg-surface-base",
        "border-border-default",
        "text-text-em-mid",
        "hover:border-surface-elevated",
        "hover:bg-surface-elevated",
        "focus-visible:bg-bg-base",
        "focus-visible:outline-hidden",
      ],
    },
    variants: {
      size: {
        md: {
          wrapper: [],
          textarea: ["text-base"],
        },
        sm: {
          wrapper: [],
          textarea: ["text-sm"],
        },
      },
    },
  },
  { responsiveVariants: true },
);
