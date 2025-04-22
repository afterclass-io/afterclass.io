import { type VariantProps, tv } from "tailwind-variants";
export type SearchCmdkVariants = VariantProps<typeof searchCmdkTheme>;

export const searchCmdkTheme = tv(
  {
    slots: {
      modal: ["w-[45rem]"],
      triggerInput: ["w-full", "text-left", "text-muted-foreground"],
      kbd: [],
      content: [
        "mt-[10%]",
        "flex-row",
        "items-center",
        "gap-2",
        "overflow-hidden",
        "py-0 sm:py-0",
      ],
      contentForm: [
        "flex",
        "h-full",
        "w-full",
        "items-center",
        "justify-between",
        "p-2",
        "pr-5",
      ],
      contentInput: [
        "flex",
        "h-11",
        "w-full",
        "shrink",
        "items-center",
        "gap-2",
        "bg-transparent",
        "p-2",
        "focus:outline-none",
      ],
      searchIcon: ["ml-1", "mr-2", "text-muted-foreground"],
      closeBtn: ["z-1", "mr-5"],
    },
  },
  { responsiveVariants: true },
);
