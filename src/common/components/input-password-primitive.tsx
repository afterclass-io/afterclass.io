import * as React from "react";
import { composeEventHandlers } from "@radix-ui/primitive";
import { Primitive } from "@radix-ui/react-primitive";
import { useControllableState } from "@radix-ui/react-use-controllable-state";

export type PasswordInputContextProps = Required<
  Pick<PasswordInputProps, "visible" | "onVisibleChange">
>;

const PasswordInputContext = React.createContext<PasswordInputContextProps>({
  visible: false,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onVisibleChange: () => {},
});

export const usePasswordInputContext = () =>
  React.useContext(PasswordInputContext);

export interface PasswordInputProps {
  visible?: boolean;
  defaultVisible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  children?: React.ReactNode;
}

const PasswordInput = ({
  visible: visibleProp,
  defaultVisible,
  onVisibleChange,
  children,
}: PasswordInputProps) => {
  const [visible, setVisible] = useControllableState({
    prop: visibleProp,
    defaultProp: defaultVisible ?? false,
    onChange: onVisibleChange,
  });

  return (
    <PasswordInputContext.Provider
      value={{
        visible,
        onVisibleChange: setVisible,
      }}
    >
      {children}
    </PasswordInputContext.Provider>
  );
};
PasswordInput.displayName = "PasswordInput";

const PasswordInputInput = React.forwardRef<
  React.ElementRef<typeof Primitive.input>,
  React.ComponentPropsWithoutRef<typeof Primitive.input>
>((props, ref) => {
  const { visible } = usePasswordInputContext();

  return (
    <Primitive.input
      ref={ref}
      type={visible ? "text" : "password"}
      {...props}
    />
  );
});
PasswordInputInput.displayName = "PasswordInputInput";

const PasswordInputToggle = React.forwardRef<
  React.ElementRef<typeof Primitive.button>,
  React.ComponentPropsWithoutRef<typeof Primitive.button>
>(({ onClick, ...props }, ref) => {
  const { visible, onVisibleChange } = usePasswordInputContext();

  return (
    <Primitive.button
      ref={ref}
      type="button"
      data-state={visible ? "visible" : "hidden"}
      onClick={composeEventHandlers(onClick, () => onVisibleChange(!visible))}
      {...props}
    />
  );
});
PasswordInputToggle.displayName = "PasswordInputToggle";

const PasswordInputIndicator = React.forwardRef<
  React.ElementRef<typeof Primitive.span>,
  React.ComponentPropsWithoutRef<typeof Primitive.span>
>((props, ref) => {
  const { visible } = usePasswordInputContext();

  return (
    <Primitive.span
      ref={ref}
      aria-hidden="true"
      data-state={visible ? "visible" : "hidden"}
      {...props}
    />
  );
});
PasswordInputIndicator.displayName = "PasswordInputIndicator";

const Root = PasswordInput;
const Input = PasswordInputInput;
const Toggle = PasswordInputToggle;
const Indicator = PasswordInputIndicator;

export { Root, Input, Toggle, Indicator };
