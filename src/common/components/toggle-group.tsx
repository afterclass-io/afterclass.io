"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { type VariantProps } from "class-variance-authority";

import { cn } from "@/common/functions";
import { toggleVariants } from "@/common/components/toggle";

/**
 * `segmented` renders the group as a proper segmented control (muted track,
 * raised active item) that stays legible in both light and dark themes.
 * The base toggle variants (`default`, `outline`) are untouched.
 */
type ToggleGroupVariant =
  | VariantProps<typeof toggleVariants>["variant"]
  | "segmented";

const ToggleGroupContext = React.createContext<{
  variant?: ToggleGroupVariant;
  size?: VariantProps<typeof toggleVariants>["size"];
}>({
  size: "default",
  variant: "default",
});

function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & {
  variant?: ToggleGroupVariant;
  size?: VariantProps<typeof toggleVariants>["size"];
}) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        "group/toggle-group flex w-fit items-center rounded-md data-[variant=outline]:shadow-xs",
        variant === "segmented" &&
          "bg-muted text-muted-foreground gap-1 rounded-lg p-1",
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & {
  variant?: ToggleGroupVariant;
  size?: VariantProps<typeof toggleVariants>["size"];
}) {
  const context = React.useContext(ToggleGroupContext);
  const resolvedVariant = context.variant ?? variant;

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={resolvedVariant}
      data-size={context.size ?? size}
      className={cn(
        toggleVariants({
          variant:
            resolvedVariant === "segmented" ? "default" : resolvedVariant,
          size: context.size ?? size,
        }),
        "min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l",
        resolvedVariant === "segmented" &&
          // min-w-fit: items in a w-fit group are flex-1/basis-0, so a wider
          // label would otherwise be squeezed below its natural width and eat
          // its horizontal padding (icon/label touching the item borders).
          "hover:bg-background/60 hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground min-w-fit rounded-md first:rounded-md last:rounded-md data-[state=on]:shadow-xs",
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
