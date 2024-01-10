import { type VariantProps, tv } from "tailwind-variants";

export type CommandVariants = VariantProps<typeof commandTheme>;

export const commandTheme = tv(
  {
    slots: {
      command: [
        "bg-bg-base",
        "border-text-em-low",
        "flex",
        "h-full",
        "w-full",
        "flex-col",
        "overflow-hidden",
        "rounded-lg",
        "border",
        "shadow-md",
      ],
      commandDialogContent: ["overflow-hidden", "p-0", "shadow-lg", "border-0"],
      commandDialog: [
        "[&_[cmdk-group-heading]]:text-text-em-low",
        "[&_[cmdk-group-heading]]:px-2",
        "[&_[cmdk-group-heading]]:font-medium",
        "[&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0",
        "[&_[cmdk-group]]:px-2",
        "[&_[cmdk-input-wrapper]_svg]:h-5",
        "[&_[cmdk-input-wrapper]_svg]:w-5",
        "[&_[cmdk-input]]:h-12",
        "[&_[cmdk-item]]:px-2",
        "[&_[cmdk-item]]:py-3",
        "[&_[cmdk-item]_svg]:h-5",
        "[&_[cmdk-item]_svg]:w-5",
      ],
      commandInputWrapper: [
        "flex",
        "items-center",
        "border-b",
        "border-text-em-low",
        "px-3",
      ],
      commandInputIcon: ["mr-2", "h-4", "w-4", "shrink-0", "opacity-50"],
      commandInput: [
        "placeholder:text-text-em-low",
        "flex",
        "h-11",
        "w-full",
        "rounded-md",
        "bg-transparent",
        "py-3",
        "text-sm",
        "outline-none",
        "disabled:cursor-not-allowed",
        "disabled:opacity-50",
      ],
      commandList: ["max-h-[300px]", "overflow-y-auto", "overflow-x-hidden"],
      commandEmpty: ["py-6", "text-center", "text-sm"],
      commandGroup: [
        "text-foreground",
        "[&_[cmdk-group-heading]]:text-text-em-low",
        "overflow-auto",
        "p-1",
        "[&_[cmdk-group-heading]]:px-2",
        "[&_[cmdk-group-heading]]:py-1.5",
        "[&_[cmdk-group-heading]]:text-xs",
        "[&_[cmdk-group-heading]]:font-medium",
      ],
      commandSeparator: ["bg-zinc-500", "-mx-1", "h-px"],
      commandItem: [
        "aria-selected:bg-zinc-800",
        "aria-selected:text-text-em-high",
        "relative",
        "flex",
        "cursor-default",
        "select-none",
        "items-center",
        "rounded-sm",
        "px-2",
        "py-1.5",
        "text-sm",
        "outline-none",
        "data-[disabled]:pointer-events-none",
        "data-[disabled]:opacity-50",
      ],
      commandShortcut: [
        "ml-auto",
        "text-xs",
        "tracking-widest",
        "text-text-em-low",
      ],
    },
    variants: {
      variant: {
        combobox: {
          command: ["max-h-60"],
        },
      },
    },
  },
  { responsiveVariants: true },
);
