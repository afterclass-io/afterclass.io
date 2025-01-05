import { type VariantProps, tv } from "tailwind-variants";

export type AvatarVariants = VariantProps<typeof avatarTheme>;

export const avatarTheme = tv(
  {
    slots: {
      avatar: [
        "relative",
        "flex",
        "h-10",
        "w-10",
        "shrink-0",
        "overflow-hidden",
        "rounded-full",
      ],
      image: ["aspect-square", "h-full", "w-full"],
      fallback: [
        "bg-border-elevated",
        "text-text-em-low",
        "flex",
        "h-full",
        "w-full",
        "items-center",
        "justify-center",
        "rounded-full",
      ],
    },
  },
  { responsiveVariants: true },
);
