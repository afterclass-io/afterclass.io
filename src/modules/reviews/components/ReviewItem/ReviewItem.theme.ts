import { type VariantProps, tv } from "tailwind-variants";

export type ReviewItemVariants = VariantProps<typeof reviewItemTheme>;

export const reviewItemTheme = tv(
  {
    slots: {
      wrapper: [
        "flex",
        "flex-col",
        "items-start",
        "h-fit",
        "max-w-prose",
        "rounded-md",
        "p-4",
        "text-left",
        "focus-ring",
        "cursor-pointer",
        "hover:bg-surface-elevated",
      ],
      headingContainer: [
        "flex",
        "flex-col",
        "content-center",
        "gap-3",
        "self-stretch",
      ],
      revieweeGroup: [
        "flex",
        "w-full",
        "items-center",
        "justify-between",
        "gap-3",
      ],
      reviewerGroup: [
        "flex",
        "items-center",
        "justify-between",
        "gap-2",
        "self-stretch",
        "text-text-em-low",
      ],
      timedelta: ["overflow-hidden", "text-sm", "text-ellipsis"],
      body: [
        "text-sm",
        "text-text-em-high",
        /**
         * TODO: replace when tailwind fixes behavior
         * see: https://github.com/tailwindlabs/tailwindcss/discussions/12127
         */
        // "break-words",
        "break-anywhere",
      ],
      labels: [
        "text-sm",
        "text-text-on-secondary",
        "flex",
        "items-start",
        "content-start",
        "gap-x-4",
        "gap-y-1",
        "flex-wrap",
        "self-stretch",
        "capitalize",
      ],
      modalTrigger: [],
      modalContent: ["w-full"],
      usernameAndTimestampWrapper: ["space-x-2"],
      username: ["font-medium"],
      modalBody: ["whitespace-pre-wrap"],
      seeMoreDivider: ["w-full", "border-t", "border-border-default"],
      seeMoreLink: ["text-sm"],
    },
    variants: {
      isLocked: {
        true: {
          body: [
            "relative",
            "flex",
            "h-16",
            "w-full",
            "self-stretch",
            "overflow-hidden",
            "text-ellipsis",
          ],
        },
      },
      size: {
        sm: {
          wrapper: ["gap-2"],
          timedelta: ["text-xs"],
          body: ["text-xs", "line-clamp-5"],
          labels: ["text-xs"],
          modalContent: ["text-xs"],
          seeMoreLink: ["h-fit"],
        },
        md: {
          wrapper: ["gap-4"],
          headingContainer: ["flex-row-reverse", "justify-between"],
          revieweeGroup: ["w-fit", "justify-normal"],
          timedelta: ["text-sm"],
          body: ["text-sm", "line-clamp-3"],
          labels: ["text-sm"],
          modalContent: ["mx-10", "my-auto", "h-auto", "text-sm"],
        },
      },
    },
  },
  { responsiveVariants: true },
);
