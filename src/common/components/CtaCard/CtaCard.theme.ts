import { type VariantProps, tv } from "tailwind-variants";

export type CtaCardVariants = VariantProps<typeof ctaCardTheme>;

export const ctaCardTheme = tv(
  {
    slots: {
      button: [
        "flex",
        "h-fit",
        "w-full",
        "items-center",
        "justify-between",
        "self-stretch",
        "border",
        "p-6",
      ],
      ctaWrapper: ["flex", "items-center", "gap-3"],
      icon: ["h-4", "w-4", "2xl:h-6", "2xl:w-6"],
      cta: ["font-semibold", "text-sm", "2xl:text-lg"],
    },
  },
  { responsiveVariants: true },
);
