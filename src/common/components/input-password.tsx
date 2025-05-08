import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/common/functions";
import {
  Input,
  InputRoot,
  InputAdornment,
  InputAdornmentButton,
  InputControl,
} from "@/common/components/input";
import * as PasswordInputPrimitive from "@/common/components/input-password-primitive";

export type PasswordInputProps = React.ComponentPropsWithoutRef<
  typeof PasswordInputPrimitive.Root
> &
  React.ComponentPropsWithoutRef<typeof InputRoot>;

const PasswordInputRoot = React.forwardRef<
  React.ComponentRef<typeof InputRoot>,
  PasswordInputProps
>(({ visible, defaultVisible, onVisibleChange, ...props }, ref) => (
  <PasswordInputPrimitive.Root
    visible={visible}
    defaultVisible={defaultVisible}
    onVisibleChange={onVisibleChange}
  >
    <InputRoot ref={ref} {...props} />
  </PasswordInputPrimitive.Root>
));
PasswordInputRoot.displayName = "PasswordInputRoot";

const PasswordInputAdornment = InputAdornment;

const PasswordInputAdornmentButton = InputAdornmentButton;

const PasswordInput = React.forwardRef<
  React.ComponentRef<typeof PasswordInputPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof PasswordInputPrimitive.Input>
>((props, ref) => (
  <InputControl>
    <PasswordInputPrimitive.Input ref={ref} asChild {...props}>
      <Input />
    </PasswordInputPrimitive.Input>
  </InputControl>
));
PasswordInput.displayName = "PasswordInput";

const PasswordInputAdornmentToggle = React.forwardRef<
  React.ComponentRef<typeof PasswordInputPrimitive.Toggle>,
  React.ComponentPropsWithoutRef<typeof PasswordInputPrimitive.Toggle>
>(({ className, ...props }, ref) => (
  <InputAdornment>
    <InputAdornmentButton asChild>
      <PasswordInputPrimitive.Toggle
        ref={ref}
        className={cn("group", className)}
        {...props}
      >
        <Eye className="hidden size-4 group-data-[state=visible]:block" />
        <EyeOff className="block size-4 group-data-[state=visible]:hidden" />
      </PasswordInputPrimitive.Toggle>
    </InputAdornmentButton>
  </InputAdornment>
));
PasswordInputAdornmentToggle.displayName = "PasswordInputAdornmentToggle";

export {
  PasswordInputRoot,
  PasswordInputAdornment,
  PasswordInputAdornmentButton,
  PasswordInput,
  PasswordInputAdornmentToggle,
};
