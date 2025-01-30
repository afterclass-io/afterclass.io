import { type VariantProps, tv } from "tailwind-variants";

export type LabelVariants = VariantProps<typeof labelTheme>;

export const labelTheme = tv(
  {
    base: [
      "bg-transparent",
      "outline-hidden",
      "placeholder:text-text-em-low",
      "flex-1",
      "text-sm",
      "font-medium",
      "leading-none",
      "peer-disabled:cursor-not-allowed",
      "peer-disabled:opacity-70",
    ],
  },
  { responsiveVariants: true },
);
