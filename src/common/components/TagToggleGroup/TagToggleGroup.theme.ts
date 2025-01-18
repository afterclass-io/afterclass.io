import { type VariantProps, tv } from "tailwind-variants";

export type TagToggleGroupVariants = VariantProps<typeof tagToggleGroupTheme>;

export const tagToggleGroupTheme = tv(
  {
    slots: {
      wrapper: [
        "flex",
        "flex-wrap",
        "content-start",
        "items-start",
        "gap-3",
        "self-stretch",
        "text-sm",
      ],
      input: ["hidden"],
      tag: ["select-none"],
    },
  },
  { responsiveVariants: true },
);
