import { type VariantProps, tv } from "tailwind-variants";

export type ComboboxVariants = VariantProps<typeof comboboxTheme>;

export const comboboxTheme = tv(
  {
    base: [
      "min-h-12",
      "w-full",
      "max-w-sm",
      "items-center",
      "justify-between",
      "self-stretch",
      "rounded-lg",
      "after:rounded-lg",
      "border-border-elevated",
      "bg-card",
      "p-2",
      "flex-1",
      "text-left",
    ],
  },
  { responsiveVariants: true },
);
