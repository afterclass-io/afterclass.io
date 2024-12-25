"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { progressTheme } from "./Progress.theme";
import { ProgressLink } from "./ProgressLink";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={progressTheme().root({ className })}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={progressTheme().indicator()}
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress, ProgressLink };
