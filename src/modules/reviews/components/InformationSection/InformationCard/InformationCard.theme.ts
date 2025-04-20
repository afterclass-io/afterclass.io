import { type VariantProps, tv } from "tailwind-variants";

export type InformationCardVariants = VariantProps<typeof informationCardTheme>;

export const informationCardTheme = tv(
  {
    slots: {
      wrapper: [
        "w-full",
        "flex",
        "flex-col",
        "bg-card",
        "rounded-2xl",
        "text-base",
      ],
      header: [
        "flex",
        "items-center",
        "font-semibold",
        "text-accent-foreground",
      ],
      icon: [],
      content: ["flex", "flex-col", "gap-2"],
      description: ["text-muted-foreground"],
      modalHeader: [],
      modalBody: ["whitespace-pre-wrap"],
    },
    variants: {
      size: {
        sm: {
          wrapper: ["gap-3", "p-4"],
          icon: ["h-4", "w-4"],
          header: ["text-lg", "gap-2"],
          modalHeader: ["text-sm"],
          modalBody: ["text-xs", "leading-5"],
          description: ["text-xs", "line-clamp-5", "leading-5"],
        },
        md: {
          wrapper: ["gap-5", "p-6"],
          icon: ["h-6", "w-6"],
          header: ["text-2xl", "gap-4"],
          modalHeader: ["text-lg"],
          modalBody: ["text-base"],
          description: ["text-sm", "line-clamp-3"],
        },
      },
    },
  },
  { responsiveVariants: true },
);
