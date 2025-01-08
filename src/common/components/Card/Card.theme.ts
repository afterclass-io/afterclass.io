import { type VariantProps, tv } from "tailwind-variants";

export type CardVariants = VariantProps<typeof cardTheme>;

export const cardTheme = tv(
  {
    slots: {
      card: ["bg-card text-card-foreground rounded-xl border shadow"],
      cardHeader: ["flex flex-col space-y-1.5 p-6"],
      cardTitle: ["font-semibold leading-none tracking-tight"],
      cardDescription: ["text-muted-foreground text-sm"],
      cardContent: ["p-6 pt-0"],
      cardFooter: ["flex items-center p-6 pt-0"],
    },
    variants: {},
  },
  { responsiveVariants: true },
);
