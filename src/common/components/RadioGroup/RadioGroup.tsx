"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

import { tagRadioGroupTheme } from "./RadioGroup.theme";
import { CircleIcon } from "@/common/components/CustomIcon";

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { root } = tagRadioGroupTheme();
  return (
    <RadioGroupPrimitive.Root
      className={root({ className })}
      {...props}
      ref={ref}
    />
  );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  const { item, indicator, indicatorIcon } = tagRadioGroupTheme();
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={item({ className })}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className={indicator()}>
        <CircleIcon className={indicatorIcon()} />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
