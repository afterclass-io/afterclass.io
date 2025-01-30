import { type VariantProps, tv } from "tailwind-variants";

export type CheckboxVariants = VariantProps<typeof checkboxTheme>;

export const checkboxTheme = tv(
  {
    slots: {
      checkboxIndicatorIcon: ["text-text-on-primary"],
      wrapper: ["gap-3", "inline-flex", "items-center"],
      checkboxRoot: [
        "flex",
        "shrink-0",
        "bg-surface-base",
        "border",
        "border-border-default",
        "ring-border-default",
        "enabled:hover:bg-element-secondary",
        "enabled:group-hover:bg-element-secondary",
        "enabled:group-hover:data-[state=checked]:bg-primary-default",
        "enabled:group-hover:data-[state=indeterminate]:bg-primary-default",
        "enabled:data-[state=checked]:bg-primary-default",
        "enabled:data-[state=indeterminate]:bg-primary-default",
      ],
      checkboxIndicator: [
        "flex",
        "w-full",
        "h-full",
        "items-center",
        "justify-center",
      ],
      label: ["flex", "w-full", "h-full", "items-center"],
    },
    variants: {
      size: {
        md: {
          checkboxIndicatorIcon: ["h-5", "w-5"],
          label: ["text-sm"],
          checkboxRoot: ["h-6", "w-6", "rounded-md"],
        },
        sm: {
          checkboxIndicatorIcon: ["h-3", "w-3"],
          label: ["text-xs"],
          checkboxRoot: ["h-4", "w-4", "rounded-xs"],
        },
      },
      disabled: {
        true: {
          checkboxIndicatorIcon: ["text-text-on-tertiary"],
          checkboxRoot: ["cursor-not-allowed", "bg-element-disabled"],
        },
      },
    },
  },
  { responsiveVariants: true },
);
