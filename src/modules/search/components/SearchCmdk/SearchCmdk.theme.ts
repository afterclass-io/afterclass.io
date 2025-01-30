import { type VariantProps, tv } from "tailwind-variants";
export type SearchCmdkVariants = VariantProps<typeof searchCmdkTheme>;

export const searchCmdkTheme = tv(
  {
    slots: {
      modal: ["w-[45rem]"],
      triggerInput: ["w-full", "text-left", "text-text-em-low"],
      kbd: [
        "pointer-events-none",
        "select-none",
        "inline-flex",
        "items-center",
        "gap-1",
        "rounded-sm",
        "border",
        "border-border-default",
        "bg-surface-elevated",
        "text-xs",
        "font-medium",
        "text-text-em-low",
        "opacity-100",
        "h-5",
        "px-1.5",
      ],
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
        "focus:outline-hidden",
      ],
      searchIcon: ["ml-1", "mr-2", "text-text-em-low"],
      closeBtn: ["z-1", "mr-5"],
    },
  },
  { responsiveVariants: true },
);
