import { type VariantProps, tv } from "tailwind-variants";

export type ToastVariants = VariantProps<typeof toastTheme>;

export const toastTheme = tv(
  {
    slots: {
      toast: [
        "group",
        "toast",
        "group-[.toaster]:bg-surface-base",
        "group-[.toaster]:text-text-em-high",
        "group-[.toaster]:border-border-default",
        "group-[.toaster]:shadow-lg",
      ],
      description: ["group-[.toast]:text-text-em-mid"],
      actionBtn: [
        "group-[.toast]:bg-primary-default",
        "group-[.toast]:text-text-on-primary",
      ],
      cancelBtn: [
        "group-[.toast]:bg-bg-alt",
        "group-[.toast]:text-text-em-mid",
      ],
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
