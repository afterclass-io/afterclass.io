import { tv, type VariantProps } from "tailwind-variants";

export const modalTheme = tv(
  {
    slots: {
      overlay: [
        "z-modal",
        "fixed",
        "inset-0",
        "bg-bg-base/90",
        "backdrop-blur-sm",
        "overflow-y-auto",
        "p-4",
        "sm:p-10",
        "flex",
        "justify-center",
        "data-[state=closed]:animate-[dialog-overlay-hide_200ms]",
        "data-[state=open]:animate-[dialog-overlay-show_200ms]",
      ],
      close: [
        "absolute",
        "right-6",
        "top-5",
        "sm:right-8",
        "sm:top-[30px]",
        "text-text-placeholder",
        "z-[1]",
        "hover:border-none",
      ],
      header: [
        "flex",
        "flex-col",
        "sm:gap-2",
        "items-start",
        "px-5",
        "text-lg",
        "sm:px-8",
        "sm:text-xl",
      ],
      headerDescription: ["text-sm", "text-text-em-low"],
      footer: ["flex", "flex-col", "gap-4", "px-5 md:px-8"],
      content: [
        "m-auto",
        "relative",
        "flex",
        "flex-col",
        "py-5",
        "sm:py-8",
        "overflow-hidden",
        "h-fit",
        "w-full",
        "max-w-[720px]",
        "rounded-[20px]",
        "border",
        "border-border-default",
        "bg-surface-base",
        "text-text-em-mid",
        "shadow-lg",
        // Not needed since overlay wraps content
        // "data-[state=closed]:animate-[dialog-content-hide_200ms]",
        // "data-[state=open]:animate-[dialog-content-show_200ms]",
      ],
      body: ["custom-scrollbar", "flex-1", "sm:px-8 px-5"],
    },
    variants: {
      variant: {
        default: {},
        command: {
          close: ["right-2.5", "top-2", "sm:right-4", "sm:top-2.5"],
        },
      },
      overflow: {
        outside: {},
        inside: {
          content: ["max-h-full"],
          body: [
            "overflow-auto",
            "py-0.5", // To avoid scrollbar when content is not overflowing
          ],
        },
      },
      size: {
        sm: {
          content: ["gap-y-4"],
        },
        md: {
          content: ["gap-y-6"],
        },
      },
    },
    defaultVariants: {
      variant: "default",
      overflow: "outside",
    },
  },
  { responsiveVariants: true },
);
export type ModalVariants = VariantProps<typeof modalTheme>;
