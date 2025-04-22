// https://ui-x.junwen-k.dev/docs/components/input-base
"use client";

import * as React from "react";
import { composeEventHandlers } from "@radix-ui/primitive";
import { composeRefs } from "@radix-ui/react-compose-refs";
import { Primitive } from "@radix-ui/react-primitive";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/common/functions";
import { Button } from "@/common/components/button";

export type InputContextProps = Pick<InputProps, "autoFocus" | "disabled"> & {
  controlRef: React.RefObject<HTMLElement | null>;
  onFocusedChange: (focused: boolean) => void;
};

const InputContext = React.createContext<InputContextProps>({
  autoFocus: false,
  controlRef: { current: null },
  disabled: false,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onFocusedChange: () => {},
});

const useInputContext = () => React.useContext(InputContext);

export interface InputProps
  extends React.ComponentPropsWithoutRef<typeof Primitive.div> {
  autoFocus?: boolean;
  disabled?: boolean;
}

const InputRoot = React.forwardRef<
  React.ComponentRef<typeof Primitive.div>,
  InputProps
>(({ autoFocus, disabled, className, onClick, ...props }, ref) => {
  const [focused, setFocused] = React.useState(false);

  const controlRef = React.useRef<HTMLElement>(null);

  return (
    <InputContext.Provider
      value={{
        autoFocus,
        controlRef,
        disabled,
        onFocusedChange: setFocused,
      }}
    >
      <Primitive.div
        ref={ref}
        onClick={composeEventHandlers(onClick, (event) => {
          // Based on MUI's <Input /> implementation.
          // https://github.com/mui/material-ui/blob/master/packages/mui-material/src/Input/Input.js#L458~L460
          if (controlRef.current && event.currentTarget === event.target) {
            controlRef.current.focus();
          }
        })}
        className={cn(
          "border-input flex min-h-9 cursor-text items-center gap-2 rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
          disabled && "cursor-not-allowed opacity-50",
          focused && "ring-ring ring-1",
          className,
        )}
        {...props}
      />
    </InputContext.Provider>
  );
});
InputRoot.displayName = "InputRoot";

const InputFlexWrapper = React.forwardRef<
  React.ComponentRef<typeof Primitive.div>,
  React.ComponentPropsWithoutRef<typeof Primitive.div>
>(({ className, ...props }, ref) => (
  <Primitive.div
    ref={ref}
    className={cn("flex flex-1 flex-wrap", className)}
    {...props}
  />
));
InputFlexWrapper.displayName = "InputFlexWrapper";

const InputControl = React.forwardRef<
  React.ComponentRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ onFocus, onBlur, ...props }, ref) => {
  const { controlRef, autoFocus, disabled, onFocusedChange } =
    useInputContext();

  return (
    <Slot
      ref={composeRefs(controlRef, ref)}
      autoFocus={autoFocus}
      onFocus={composeEventHandlers(onFocus, () => onFocusedChange(true))}
      onBlur={composeEventHandlers(onBlur, () => onFocusedChange(false))}
      {...{ disabled }}
      {...props}
    />
  );
});
InputControl.displayName = "InputControl";

export interface InputAdornmentProps
  extends React.ComponentPropsWithoutRef<"div"> {
  asChild?: boolean;
  disablePointerEvents?: boolean;
}

const InputAdornment = React.forwardRef<
  React.ComponentRef<"div">,
  InputAdornmentProps
>(({ className, disablePointerEvents, asChild, children, ...props }, ref) => {
  const Comp = asChild ? Slot : typeof children === "string" ? "p" : "div";

  const isAction =
    React.isValidElement(children) && children.type === InputAdornmentButton;

  return (
    <Comp
      ref={ref}
      className={cn(
        "text-muted-foreground flex items-center [&_svg]:size-4",
        (!isAction || disablePointerEvents) && "pointer-events-none",
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});
InputAdornment.displayName = "InputAdornment";

const InputAdornmentButton = React.forwardRef<
  React.ComponentRef<typeof Button>,
  React.ComponentPropsWithoutRef<typeof Button>
>(
  (
    {
      type = "button",
      variant = "ghost",
      size = "icon",
      disabled: disabledProp,
      className,
      ...props
    },
    ref,
  ) => {
    const { disabled } = useInputContext();

    return (
      <Button
        ref={ref}
        type={type}
        variant={variant}
        size={size}
        disabled={disabled ?? disabledProp}
        className={cn("size-6", className)}
        {...props}
      />
    );
  },
);
InputAdornmentButton.displayName = "InputAdornmentButton";

const Input = React.forwardRef<
  React.ComponentRef<typeof Primitive.input>,
  React.ComponentPropsWithoutRef<typeof Primitive.input>
>(({ className, ...props }, ref) => (
  <Primitive.input
    ref={ref}
    className={cn(
      "placeholder:text-muted-foreground w-full flex-1 bg-transparent file:border-0 file:bg-transparent file:text-sm file:font-medium focus:outline-none disabled:pointer-events-none",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export {
  Input,
  InputRoot,
  InputFlexWrapper,
  InputControl,
  InputAdornment,
  InputAdornmentButton,
};
