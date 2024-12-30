"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { toastTheme } from "./Toast.theme";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const { toast, description, actionBtn, cancelBtn } = toastTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: toast(),
          description: description(),
          actionButton: actionBtn(),
          cancelButton: cancelBtn(),
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
