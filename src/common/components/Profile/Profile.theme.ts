import { type VariantProps, tv } from "tailwind-variants";

export type ProfileVariants = VariantProps<typeof profileTheme>;

export const profileTheme = tv(
  {
    slots: {
      wrapper: ["flex", "items-center", "gap-2", "text-center"],
      name: ["overflow-hidden", "text-sm", "text-ellipsis", "text-text-em-low"],
    },
  },
  { responsiveVariants: true },
);
