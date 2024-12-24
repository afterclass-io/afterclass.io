import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";

import PhCaretDown from "~icons/ph/caret-down";
import { selectTheme } from "../Select.theme";

export const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => {
  const { scrollButton } = selectTheme();
  return (
    <SelectPrimitive.ScrollDownButton
      ref={ref}
      className={scrollButton({ className })}
      {...props}
    >
      <PhCaretDown />
    </SelectPrimitive.ScrollDownButton>
  );
});
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;
