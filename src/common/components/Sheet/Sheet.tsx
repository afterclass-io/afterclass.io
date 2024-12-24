"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import PhX from "~icons/ph/x";

import { SheetOverlay } from "./SheetOverlay";
import { SheetHeader } from "./SheetHeader";
import { SheetFooter } from "./SheetFooter";
import { SheetTitle } from "./SheetTitle";
import { SheetDescription } from "./SheetDescription";

import { sheetTheme, type SheetVariants } from "./Sheet.theme";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    SheetVariants {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => {
  const { content, close } = sheetTheme({ side });

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        className={content({ className })}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className={close()}>
          <PhX className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = SheetPrimitive.Content.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
