import { type VariantProps, tv } from "tailwind-variants";

export type TagRadioGroupVariants = VariantProps<typeof tagRadioGroupTheme>;

export const tagRadioGroupTheme = tv(
  {
    slots: {
      root: ["grid gap-2"],
      item: [
        "border-primary text-primary ring-offset-background focus-visible:ring-ring aspect-square h-4 w-4 rounded-full border focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      ],
      indicator: ["flex items-center justify-center"],
      indicatorIcon: ["h-2.5 w-2.5 fill-current text-current"],
    },
  },
  { responsiveVariants: true },
);
