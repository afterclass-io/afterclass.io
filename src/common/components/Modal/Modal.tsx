import { type DialogProps, Root, Trigger, Close } from "@radix-ui/react-dialog";
import { type ComponentPropsWithoutRef, type PropsWithChildren } from "react";

import ModalProvider from "./ModalProvider";

import { type ModalVariants } from "./Modal.theme";
import { ModalBody } from "./ModalBody";
import { ModalContent } from "./ModalContent";
import { ModalFooter } from "./ModalFooter";
import { ModalHeader } from "./ModalHeader";
import { ModalTitle } from "./ModalTitle";
import { ModalDescription } from "./ModalDescription";

export interface ModalProps
  extends ComponentPropsWithoutRef<"div">,
    ModalVariants,
    DialogProps {
  hasCloseButton?: boolean;
  hasOverlay?: boolean;
  preventClickOutsideToClose?: boolean;
}
export const Modal = ({
  children,
  hasCloseButton = true,
  hasOverlay = true,
  preventClickOutsideToClose = false,
  ...props
}: PropsWithChildren<ModalProps>) => {
  return (
    <ModalProvider
      hasCloseButton={hasCloseButton}
      hasOverlay={hasOverlay}
      preventClickOutsideToClose={preventClickOutsideToClose}
      {...props}
    >
      <Root {...props}>
        <>{children}</>
      </Root>
    </ModalProvider>
  );
};

Modal.Trigger = Trigger;
Modal.Content = ModalContent;
Modal.Header = ModalHeader;
Modal.Title = ModalTitle;
Modal.Description = ModalDescription;
Modal.Footer = ModalFooter;
Modal.Body = ModalBody;
Modal.Close = Close;
