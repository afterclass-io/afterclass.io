import { tv, type VariantProps } from "tailwind-variants";

export const progressTheme = tv(
  {
    slots: {
      root: [
        "bg-primary-default/20",
        "relative",
        "h-2",
        "w-full",
        "overflow-hidden",
        "rounded-full",
      ],
      indicator: [
        "bg-primary-default",
        "h-full",
        "w-full",
        "flex-1",
        "transition-all",
      ],
    },
  },
  { responsiveVariants: true },
);
export type ProgressVariants = VariantProps<typeof progressTheme>;
