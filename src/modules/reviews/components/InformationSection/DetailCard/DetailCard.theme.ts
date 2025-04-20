import { type VariantProps, tv } from "tailwind-variants";

export type DetailCardVariations = VariantProps<typeof detailCardTheme>;

export const detailCardTheme = tv(
  {
    slots: {
      wrapper: [
        "w-full",
        "h-full",
        "flex",
        "flex-col",
        "bg-card",
        "rounded-2xl",
        "text-base",
      ],
      header: ["font-semibold", "text-accent-foreground"],
      body: ["flex", "flex-col"],
      content: ["flex", "font-medium"],
      field: ["text-text-em-low"],
      value: ["text-muted-foreground"],
    },
    variants: {
      size: {
        sm: {
          wrapper: ["gap-3", "p-4"],
          header: ["text-lg"],
          body: ["gap-1"],
          content: ["text-sm", "gap-2"],
        },
        md: {
          wrapper: ["gap-5", "p-6"],
          header: ["text-2xl"],
          body: ["gap-3"],
          content: ["text-lg", "gap-3"],
        },
      },
    },
  },
  { responsiveVariants: true },
);
