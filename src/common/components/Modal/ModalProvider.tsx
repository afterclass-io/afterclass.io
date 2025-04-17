import { createContext, useContext, type PropsWithChildren, type JSX } from "react";

import { type ModalVariants } from "./Modal.theme";

import { type ModalProps } from "./Modal";

export interface ModalProviderProps
  extends Partial<ModalVariants>,
    ModalProps {}

type ModalProviderContext = ReturnType<typeof useModalValues>;

const ModalContext = createContext<Partial<ModalProviderContext> | undefined>(
  undefined,
);

// For inferring return type
const useModalValues = (props: ModalProviderProps) => {
  return props;
};

export const ModalProvider = ({
  children,
  ...props
}: PropsWithChildren<ModalProviderProps>): JSX.Element => {
  const values = useModalValues(props);
  return (
    <ModalContext.Provider value={values}>{children}</ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error("useModal was used outside of its Provider");
  }
  return context;
};

export default ModalProvider;
