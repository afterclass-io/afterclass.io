import { type VariantProps, tv } from "tailwind-variants";
export type ReviewSectionVariants = VariantProps<typeof reviewSectionTheme>;

export const reviewSectionTheme = tv(
  {
    slots: {
      wrapper: [
        "flex",
        "flex-col",
        "bg-surface-base",
        "rounded-3xl",
        "w-fit",
        "flex-initial",
        "has-[[data-variant=full-width]]:w-full",
        "has-[[data-variant=full-width]]:md:w-[48rem]",
      ],
      header: ["flex", "justify-between", "p-4", "pb-0", "pr-0"],
      title: ["flex", "font-semibold", "items-center"],
      icon: ["rotate-90"],
      reviews: ["flex", "flex-col"],
    },
    variants: {
      size: {
        sm: {
          title: ["text-lg", "gap-2"],
          icon: ["h-4", "w-4"],
          wrapper: ["p-3", "gap-4"],
          reviews: ["gap-3"],
          header: ["flex-col", "items-start"],
        },
        md: {
          title: ["text-2xl", "gap-4"],
          icon: ["h-6", "w-6"],
          wrapper: ["p-8", "gap-6"],
          reviews: ["gap-5"],
          header: ["flex-row", "items-center"],
        },
      },
    },
  },
  { responsiveVariants: true },
);
