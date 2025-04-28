import { tv, type VariantProps } from "tailwind-variants";

export const announcementsCarouselTheme = tv({
  slots: {
    wrapper: ["flex", "flex-col", "items-start", "gap-4"],
    announcements: [
      "flex",
      "items-start",
      "gap-6",
      "self-stretch overflow-x-auto",
    ],
    heading: ["text-sm", "font-semibold", "text-accent-foreground"],
    divider: ["my-4"],
    card: [
      "relative",
      "overflow-hidden",
      "rounded-lg",
      "shrink-0",
      "before:block",
      "before:absolute",
      "before:content-['']",
      "before:w-full",
      "before:h-full",
      "before:z-10",
      "before:opacity-80",
      "before:bg-gradient-to-t",
      "before:from-primary",
      "before:from-20%",
      "before:to-60%",
      "before:to-primary/20",
    ],
    text: [
      "z-20",
      "absolute",
      "bottom-3",
      "left-6",
      "text-lg",
      "font-semibold",
      "text-accent-foreground",
    ],
  },
});

export type AnnouncementCarouselVariants = VariantProps<
  typeof announcementsCarouselTheme
>;
