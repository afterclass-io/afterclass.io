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
      icon: ["h-6", "w-6"],
      cta: ["font-semibold", "text-lg"],
    },
  },
  { responsiveVariants: true },
);
