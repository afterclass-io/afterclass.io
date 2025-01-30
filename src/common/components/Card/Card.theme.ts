import { type VariantProps, tv } from "tailwind-variants";

export type CardVariants = VariantProps<typeof cardTheme>;

export const cardTheme = tv(
  {
    slots: {
      card: [
        "bg-surface-base",
        "text-text-em-mid",
        "rounded-xl",
        "border",
        "border-border-default",
        "shadow-sm",
      ],
      cardHeader: ["flex", "flex-col", "space-y-1.5", "p-6"],
      cardTitle: ["font-semibold", "leading-none", "tracking-tight"],
      cardDescription: ["text-text-em-low", "text-sm"],
      cardContent: ["p-6", "pt-0"],
      cardFooter: ["flex", "items-center", "p-6", "pt-0"],
    },
    variants: {},
  },
  { responsiveVariants: true },
);
