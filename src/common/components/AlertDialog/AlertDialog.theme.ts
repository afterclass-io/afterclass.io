import { type VariantProps, tv } from "tailwind-variants";

export type AlertDialogVariants = VariantProps<typeof alertDialogTheme>;

export const alertDialogTheme = tv(
  {
    slots: {
      overlay: [
        "fixed",
        "inset-0",
        "z-50",
        "bg-black/80",
        "data-[state=open]:animate-in",
        "data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0",
        "data-[state=open]:fade-in-0",
      ],
      content: [
        "bg-surface-elevated",
        "fixed",
        "left-[50%]",
        "top-[50%]",
        "z-50",
        "grid",
        "w-full",
        "max-w-lg",
        "translate-x-[-50%]",
        "translate-y-[-50%]",
        "gap-4",
        "border",
        "p-6",
        "shadow-lg",
        "duration-200",
        "data-[state=open]:animate-in",
        "data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0",
        "data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95",
        "data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-left-1/2",
        "data-[state=closed]:slide-out-to-top-[48%]",
        "data-[state=open]:slide-in-from-left-1/2",
        "data-[state=open]:slide-in-from-top-[48%]",
        "sm:rounded-lg",
      ],
      header: ["flex flex-col space-y-2 text-center sm:text-left"],
      footer: ["flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2"],
      title: ["text-lg font-semibold"],
      description: ["text-text-em-mid", "text-sm"],
      actionBtn: [],
      cancelBtn: ["mt-2 sm:mt-0"],
    },
    variants: {
      size: {
        md: {},
        sm: {},
      },
    },
  },
  { responsiveVariants: true },
);
