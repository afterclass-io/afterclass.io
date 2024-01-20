import { tv, type VariantProps } from "tailwind-variants";

export const modalTheme = tv({
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
    ],
    header: ["flex", "flex-col", "gap-2", "items-start", "px-6 ", "sm:px-8"],
    headerDescription: ["text-sm", "text-text-em-low"],
    footer: ["flex", "flex-col", "gap-4", "px-6 md:px-8"],
    content: [
      "m-auto",
      "relative",
      "flex",
      "flex-col",
      "gap-y-6",
      "py-6",
      "sm:py-8",
      "overflow-hidden",
      "h-fit",
      "w-full",
      "max-w-[420px]",
      "rounded-[20px]",
      "border",
      "border-border-default",
      "bg-surface-base",
      "text-text-em-mid",
      // Not needed since overlay wraps content
      // "data-[state=closed]:animate-[dialog-content-hide_200ms]",
      // "data-[state=open]:animate-[dialog-content-show_200ms]",
    ],
    body: ["custom-scrollbar", "flex-1", "sm:px-8 px-6"],
  },
  variants: {
    variant: {
      default: {},
      command: {
        close: ["right-2.5", "top-2", "sm:right-4", "sm:top-2.5"],
      },
    },
  },
  defaultVariants: {
    variant: "default",
  },
});
export type ModalVariants = VariantProps<typeof modalTheme>;
