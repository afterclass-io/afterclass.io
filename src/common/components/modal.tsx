import {
  createContext,
  useContext,
  type PropsWithChildren,
  type JSX,
  type ComponentPropsWithoutRef,
} from "react";
import {
  type DialogProps,
  Root,
  Portal,
  type DialogContentProps,
  Content,
  Close as ModalClose,
  Overlay,
  Title as ModalTitle,
  Description as ModalDescription,
  Trigger as ModalTrigger,
} from "@radix-ui/react-dialog";

import { XCloseIcon } from "@/common/components/icons";
import { cn } from "@/common/functions";

type ModalProviderProps = ModalProps;

type ModalProviderContext = ReturnType<typeof useModalValues>;

const ModalContext = createContext<Partial<ModalProviderContext> | undefined>(
  undefined,
);

// For inferring return type
const useModalValues = (props: ModalProviderProps) => {
  return props;
};

const ModalProvider = ({
  children,
  ...props
}: PropsWithChildren<ModalProviderProps>): JSX.Element => {
  const values = useModalValues(props);
  return (
    <ModalContext.Provider value={values}>{children}</ModalContext.Provider>
  );
};

const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error("useModal was used outside of its Provider");
  }
  return context;
};

interface ModalProps extends ComponentPropsWithoutRef<"div">, DialogProps {
  hasCloseButton?: boolean;
  hasOverlay?: boolean;
  preventClickOutsideToClose?: boolean;
}
const Modal = ({
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
      <Root {...props}>{children}</Root>
    </ModalProvider>
  );
};

type PointerDownOutsideEvent = CustomEvent<{
  originalEvent: PointerEvent;
}>;

interface ModalContentProps extends DialogContentProps {
  className?: string;
}

const ModalContent = ({
  children,
  className,
  ...props
}: PropsWithChildren<ModalContentProps>) => {
  const { hasCloseButton, preventClickOutsideToClose } = useModal();

  const preventClickOutsideToCloseProps = preventClickOutsideToClose && {
    onPointerDownOutside: (e: PointerDownOutsideEvent) => e.preventDefault(),
    onEscapeKeyDown: (e: KeyboardEvent) => e.preventDefault(),
  };

  return (
    <Portal>
      <Overlay className="bg-background/80 fixed inset-0 z-50 flex justify-center overflow-y-auto p-4 backdrop-blur-sm data-[state=closed]:animate-[dialog-overlay-hide_200ms] data-[state=open]:animate-[dialog-overlay-show_200ms] sm:p-10">
        <Content
          className={cn(
            "border-border-default bg-card text-muted-foreground relative m-auto flex h-fit w-full max-w-[720px] flex-col overflow-hidden rounded-[20px] border py-5 shadow-lg sm:py-8",
            className,
          )}
          {...preventClickOutsideToCloseProps}
          {...props}
        >
          {children}
          {hasCloseButton && (
            <ModalClose className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
              <XCloseIcon />
              <span className="sr-only">Close</span>
            </ModalClose>
          )}
        </Content>
      </Overlay>
    </Portal>
  );
};

export {
  Modal,
  ModalContent,
  ModalTitle,
  ModalDescription,
  ModalTrigger,
  ModalClose,
};
