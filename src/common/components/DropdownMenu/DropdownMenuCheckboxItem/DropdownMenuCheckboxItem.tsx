"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

import PhCheck from "~icons/ph/check";

import { dropdownMenuTheme } from "../DropdownMenu.theme";

export const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => {
  const { checkboxItem, checkboxItemIndicatorWrapper, checkboxItemCheckIcon } =
    dropdownMenuTheme();
  return (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      className={checkboxItem({ className })}
      checked={checked}
      {...props}
    >
      <span className={checkboxItemIndicatorWrapper()}>
        <DropdownMenuPrimitive.ItemIndicator>
          <PhCheck className={checkboxItemCheckIcon()} />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
});
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName;
