"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import PhCaretRight from "~icons/ph/caret-right";

import { dropdownMenuTheme } from "../DropdownMenu.theme";

export const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => {
  const { subtrigger, subtriggerIcon } = dropdownMenuTheme();
  return (
    <DropdownMenuPrimitive.SubTrigger
      ref={ref}
      className={subtrigger({ inset, className })}
      {...props}
    >
      {children}
      <PhCaretRight className={subtriggerIcon()} />
    </DropdownMenuPrimitive.SubTrigger>
  );
});
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName;
