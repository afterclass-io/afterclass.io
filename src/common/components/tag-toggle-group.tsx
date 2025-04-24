import { forwardRef, type ComponentPropsWithoutRef } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import type { FieldValues, ControllerRenderProps } from "react-hook-form";

import { Tag } from "@/common/components/tag";

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
  return (
    <div className="flex flex-wrap content-start items-start gap-3 self-stretch text-sm">
      {items.map(({ label, value }, i) => (
        <label key={i}>
          <CheckboxPrimitive.Root
            className="hidden"
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
          <Tag
            className="font-normal select-none"
            deletable={false}
            variant={fieldValue.includes(value) ? "outline" : "soft"}
            color="primary"
            onClick={() => {
              // intentionally do nothing
            }}
          >
            {label}
          </Tag>
        </label>
      ))}
    </div>
  );
});
TagToggleGroup.displayName = "TagToggleGroup";
