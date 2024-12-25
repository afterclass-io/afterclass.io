import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { modalTheme } from "../Modal.theme";

export const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={modalTheme({
      size: { initial: "sm", md: "md" },
    }).headerDescription({ className: className })}
    {...props}
  />
));
ModalDescription.displayName = DialogPrimitive.Description.displayName;
