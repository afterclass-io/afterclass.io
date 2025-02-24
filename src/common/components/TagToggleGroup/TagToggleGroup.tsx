import { forwardRef, type ComponentPropsWithoutRef } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import type { FieldValues, ControllerRenderProps } from "react-hook-form";

import { Tag } from "@/common/components/Tag";
import { tagToggleGroupTheme } from "./TagToggleGroup.theme";

type OptionalControllerProps = {
  [K in keyof ControllerRenderProps<
    FieldValues,
    string
  >]?: ControllerRenderProps<FieldValues, string>[K];
};

export type TagToggleGroupProps = ComponentPropsWithoutRef<"button"> &
  OptionalControllerProps & {
    items: { label: string; value: string }[];
  };

export const TagToggleGroup = forwardRef<
  HTMLButtonElement,
  TagToggleGroupProps
>(({ items, value: propValue, ...props }, ref) => {
  const fieldValue = propValue as string[];
  const { wrapper, input, tag } = tagToggleGroupTheme();
  return (
    <div className={wrapper()}>
      {items.map(({ label, value }, i) => (
        <label key={i}>
          <CheckboxPrimitive.Root
            className={input()}
            value={value}
            checked={fieldValue?.includes(value)}
            onCheckedChange={(checked) => {
              if (checked) {
                props.onChange?.([...fieldValue, value]);
              } else {
                props.onChange?.(fieldValue.filter((v) => v !== value));
              }
            }}
            {...props}
            ref={ref}
          />
          <Tag clickable className={tag()}>
            {label}
          </Tag>
        </label>
      ))}
    </div>
  );
});
TagToggleGroup.displayName = "TagToggleGroup";
