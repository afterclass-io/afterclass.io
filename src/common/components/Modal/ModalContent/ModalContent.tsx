import { Icon } from "@iconify-icon/react";
import {
  Portal,
  Content,
  type DialogContentProps,
  Close,
  Overlay,
} from "@radix-ui/react-dialog";
import { type PropsWithChildren } from "react";
import { Button } from "@/common/components/Button";

import { modalTheme } from "@/common/components/Modal/Modal.theme";
import { useModal } from "@/common/components/Modal/ModalProvider";

type PointerDownOutsideEvent = CustomEvent<{
  originalEvent: PointerEvent;
}>;

export interface ModalContentProps extends DialogContentProps {
  className?: string;
}

export const ModalContent = ({
  children,
  className,
  ...props
}: PropsWithChildren<ModalContentProps>) => {
  const { hasCloseButton, preventClickOutsideToClose, variant } = useModal();

  const { content, close, overlay } = modalTheme({ variant });

  const preventClickOutsideToCloseProps = preventClickOutsideToClose && {
    onPointerDownOutside: (e: PointerDownOutsideEvent) => e.preventDefault(),
    onEscapeKeyDown: (e: KeyboardEvent) => e.preventDefault(),
  };

  return (
    <Portal>
      <Overlay className={overlay()}>
        <Content
          className={content({ className })}
          {...preventClickOutsideToCloseProps}
          {...props}
        >
          {hasCloseButton && (
            <Close asChild>
              <Button
                className={close()}
                variant="ghost"
                iconLeft={
                  <Icon
                    icon="ph:x-bold"
                    className="stroke-current"
                    width="100%"
                    height="100%"
                  />
                }
                aria-label="close"
                size="sm"
              />
            </Close>
          )}
          {children}
        </Content>
      </Overlay>
    </Portal>
  );
};
