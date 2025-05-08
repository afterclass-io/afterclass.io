"use client";
import { type ComponentRef, forwardRef, useState } from "react";

import { CheckIcon, ChevronDownIcon } from "@/common/components/icons";
import { Button } from "@/common/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/common/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/popover";
import { cn } from "@/common/functions/cn";

export type ComboboxProps = {
  items: { label: string; value: string }[];
  placeholder: string;
  triggerLabel: string;
  onSelectChange?: (selectedValue: string) => void;
};

// TODO: find a better way for searching
export const Combobox = forwardRef<
  ComponentRef<typeof CommandItem>,
  ComboboxProps
>(({ items, placeholder, triggerLabel, onSelectChange }, ref) => {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  const isMatched = (v: string) => v === value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-expanded={open}
          className="bg-card min-h-12 w-full max-w-72 flex-1 items-center justify-between self-stretch rounded-lg p-2 text-left"
          data-test="combobox-trigger"
        >
          {value ? items.find((el) => el.value === value)?.label : triggerLabel}
          <ChevronDownIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Command
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
          <CommandInput placeholder={placeholder} data-test="combobox-input" />
          <CommandSeparator />
          <CommandEmpty>Nothing found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {items.map((el) => (
                <CommandItem
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
                  <CheckIcon
                    className={cn(
                      "text-primary",
                      isMatched(el.value) ? "visible" : "invisible",
                    )}
                  />
                  {el.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
Combobox.displayName = "Combobox";
