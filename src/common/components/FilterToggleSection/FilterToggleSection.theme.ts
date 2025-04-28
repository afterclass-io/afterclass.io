import { type VariantProps, tv } from "tailwind-variants";

export type FilterToggleSectionVariants = VariantProps<
  typeof filterToggleSectionTheme
>;

export const filterToggleSectionTheme = tv(
  {
    slots: {
      section: [
        "flex",
        "w-full",
        "flex-col",
        "items-start",
        "rounded-2xl",
        "bg-card",
        "relative",
        "select-none",
      ],
      sectionHeader: ["flex", "items-center", "text-2xl"],
      headerIcon: ["w-6", "h-6"],
      container: ["flex", "items-start", "self-stretch"],
      item: [
        "group",
        "flex",
        "items-center",
        "rounded-lg",
        "cursor-pointer",
        "hover:bg-accent",
      ],
      itemHeader: ["text-accent-foreground"],
      content: ["flex", "gap-2"],
      statWrapper: ["flex", "items-center"],
      contentSubheaderWrapper: [
        "flex",
        "items-center",
        "justify-between",
        "self-stretch",
      ],
      stat: [
        "flex",
        "items-center",
        "gap-1",
        "text-sm",
        "text-muted-foreground",
      ],
    },
    variants: {
      selected: {
        true: {
          item: ["bg-accent"],
        },
      },
      size: {
        md: {
          section: ["p-6", "gap-5"],
          sectionHeader: ["text-2xl", "gap-4", "pl-0"],
          container: ["gap-4", "flex-row", "flex-wrap", "content-start"],
          item: ["w-64", "p-3", "gap-4", "border", "border-border-elevated"],
          content: ["flex-col", "justify-center", "items-start", "flex-auto"],
          itemHeader: [
            "text-sm",
            "line-clamp-none",
            "font-semibold",
            "flex-auto",
          ],
          headerIcon: ["w-6", "h-6"],
          statWrapper: ["gap-4"],
        },
        sm: {
          section: ["py-4", "px-3", "gap-3"],
          sectionHeader: ["text-lg", "gap-2", "pl-1"],
          container: ["gap-0", "flex-col"],
          item: ["py-2", "pl-1", "pr-2", "gap-2", "self-stretch", "border-0"],
          content: ["items-center", "justify-between", "flex-[1_0_0]"],
          headerIcon: ["w-4", "h-4"],
          itemHeader: [
            "",
            "line-clamp-1",
            "text-ellipsis",
            "font-medium",
            "leading-4",
            "flex-[1_0_0]",
          ],
          statWrapper: ["gap-3"],
          contentSubheaderWrapper: ["gap-2"],
        },
      },
    },
  },
  { responsiveVariants: true },
);
