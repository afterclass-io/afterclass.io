import * as DialogPrimitive from "@radix-ui/react-dialog";

import {
  Heading,
  type HeadingProps,
} from "@/common/components/Heading/Heading";
import { forwardRef } from "react";

export interface ModalTitleProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> {
  headingProps?: HeadingProps<"h2">;
}

export const ModalTitle = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  ModalTitleProps
>(({ headingProps, children, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} {...props}>
    <Heading as="h2" {...headingProps}>
      {children}
    </Heading>
  </DialogPrimitive.Title>
));
ModalTitle.displayName = DialogPrimitive.Title.displayName;
