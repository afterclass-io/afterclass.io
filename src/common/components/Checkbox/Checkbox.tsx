"use client";

import { forwardRef, useId } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";

import PhCheck from "~icons/ph/check";
import PhMinus from "~icons/ph/minus";

import { checkboxTheme, type CheckboxVariants } from "./Checkbox.theme";

export type CheckedState = CheckboxPrimitive.CheckedState;

export type CheckboxProps = CheckboxVariants &
  CheckboxPrimitive.CheckboxProps & {
    label?: string;
  };

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ label, className, size, disabled = false, ...props }, ref) => {
    const id = useId();
    const {
      wrapper,
      checkboxRoot,
      checkboxIndicator,
      checkboxIndicatorIcon,
      label: labelContainer,
    } = checkboxTheme({
      className,
      size: size ?? { initial: "sm", md: "md" },
      disabled,
    });

    return (
      <div className={wrapper()}>
        <CheckboxPrimitive.Root
          id={id}
          disabled={disabled}
          className={checkboxRoot()}
          {...props}
          ref={ref}
        >
          <CheckboxPrimitive.Indicator className={checkboxIndicator()}>
            {props.checked === "indeterminate" ? (
              <PhMinus className={checkboxIndicatorIcon()} />
            ) : (
              <PhCheck className={checkboxIndicatorIcon()} />
            )}
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        {label && (
          <label htmlFor={id} className={labelContainer()}>
            {label}
          </label>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";
