import { type VariantProps, tv } from "tailwind-variants";

export type SubmitButtonGroupVariants = VariantProps<
  typeof submitButtonGroupTheme
>;

export const submitButtonGroupTheme = tv(
  {
    slots: {
      wrapper: [
        "inline-flex",
        "h-10",
        "shrink-0",
        "items-center",
        "justify-center",
        "rounded-3xl",
        "border-border-primary",
        "bg-primary",
      ],
      submitButton: [
        "flex",
        "content-center",
        "items-center",
        "gap-2",
        "self-stretch",
        "rounded-none",
        "rounded-l-3xl",
        "border-border-primary",
        "pl-4",
        "pr-3",
        "after:rounded-none",
        "after:rounded-l-3xl",
      ],
      selectTrigger: [
        "flex",
        "h-full",
        "w-auto",
        "content-center",
        "items-center",
        "gap-4",
        "self-stretch",
        "rounded-none",
        "rounded-r-3xl",
        "border-border-primary",
        "py-3",
        "after:rounded-none",
        "after:rounded-r-3xl",
      ],
      selectIcon: ["h-5", "w-5"],
      selectItem: [
        "h-10",
        "gap-2",
        "self-stretch",
        "py-4",
        "text-sm",
        "font-medium",
      ],
    },
  },
  { responsiveVariants: true },
);
