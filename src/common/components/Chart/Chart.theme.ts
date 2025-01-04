import { type VariantProps, tv } from "tailwind-variants";

export type CheckboxVariants = VariantProps<typeof checkboxTheme>;

export const checkboxTheme = tv(
  {
    slots: {},
    variants: {},
  },
  { responsiveVariants: true },
);
