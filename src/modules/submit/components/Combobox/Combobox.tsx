"use client";
import { type ElementRef, forwardRef, useState } from "react";
import PhCheck from "~icons/ph/check";
import PhCaretDown from "~icons/ph/caret-down";

import { Button } from "@/common/components/Button";
import { Command } from "@/common/components/Command";
import { Popover } from "@/common/components/Popover";
import { cn } from "@/common/functions/cn";
import { comboboxTheme } from "./Combobox.theme";

export type ComboboxProps = {
  items: { label: string; value: string }[];
  placeholder: string;
  triggerLabel: string;
  onSelectChange?: (selectedValue: string) => void;
};

// TODO: find a better way for searching
export const Combobox = forwardRef<
  ElementRef<typeof Command.Item>,
  ComboboxProps
>(({ items, placeholder, triggerLabel, onSelectChange }, ref) => {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  const isMatched = (v: string) => v === value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="tertiary"
          as="button"
          aria-expanded={open}
          iconRight={<PhCaretDown />}
          className={comboboxTheme()}
          data-test="combobox-trigger"
        >
          {value ? items.find((el) => el.value === value)?.label : triggerLabel}
        </Button>
      </Popover.Trigger>
      <Popover.Content variant="combobox">
        <Command
          variant="combobox"
          value={value}
          filter={(_, search, keywords) => {
            if (
              keywords?.join("").toLowerCase().includes(search.toLowerCase())
            ) {
              return 1;
            }
            return 0;
          }}
        >
          <Command.Input placeholder={placeholder} data-test="combobox-input" />
          <Command.Separator />
          <Command.Empty>Nothing found.</Command.Empty>
          <Command.List>
            <Command.Group>
              {items.map((el) => (
                <Command.Item
                  id={el.value}
                  key={el.value}
                  value={el.value}
                  keywords={[el.label]}
                  onSelect={(selectedValue) => {
                    setValue(selectedValue === value ? "" : selectedValue);
                    setOpen(false);
                    onSelectChange?.(selectedValue);
                  }}
                  aria-selected={isMatched(el.value)}
                  data-selected={isMatched(el.value) ? "" : undefined}
                  ref={ref}
                  data-test={`combobox-item-${el.value}`}
                >
                  <PhCheck
                    className={cn(
                      "text-primary-default",
                      isMatched(el.value) ? "visible" : "invisible",
                    )}
                  />
                  {el.label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </Popover.Content>
    </Popover>
  );
});
Combobox.displayName = "Combobox";
