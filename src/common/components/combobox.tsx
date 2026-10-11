"use client";

import { forwardRef, useState } from "react";

import { Button } from "@/common/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/common/components/command";
import { CheckIcon, ChevronDownIcon } from "@/common/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/popover";
import { cn } from "@/common/functions/cn";

export type ComboboxOption = { value: string; label: string };

export type ComboboxProps = {
  options: ComboboxOption[];
  total?: number; // server total, for the "showing X of Y" footer
  value: ComboboxOption | null; // controlled selection
  onValueChange: (next: ComboboxOption | null) => void;
  query: string;
  onQueryChange: (query: string) => void; // raw text, not debounced
  isFetching?: boolean;
  isStale?: boolean; // results lag the input
  placeholder: string;
  triggerLabel: string;
  emptyText?: string; // default "Nothing found."
  idle?: boolean; // query is below the minimum length, nothing was searched
  hintText?: string; // shown while idle
  disabled?: boolean;
  id?: string; // forwarded by FormControl
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  className?: string;
};

export const Combobox = forwardRef<HTMLButtonElement, ComboboxProps>(
  (
    {
      options,
      total,
      value,
      onValueChange,
      query,
      onQueryChange,
      isFetching = false,
      isStale = false,
      placeholder,
      triggerLabel,
      emptyText = "Nothing found.",
      idle = false,
      hintText,
      disabled = false,
      id,
      "aria-invalid": ariaInvalid,
      "aria-describedby": ariaDescribedby,
      className,
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedby}
            aria-expanded={open}
            className={cn(
              "bg-card min-h-12 w-full max-w-80 flex-1 items-center justify-between self-stretch rounded-lg p-2 text-left font-normal",
              className,
            )}
            data-test="combobox-trigger"
          >
            <span className="truncate">
              {value ? value.label : triggerLabel}
            </span>
            <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command
            shouldFilter={false}
            vimBindings={false}
            label={triggerLabel}
          >
            <CommandInput
              placeholder={placeholder}
              value={query}
              onValueChange={onQueryChange}
              data-test="combobox-input"
              onKeyDown={(e) => {
                if (isStale && e.key === "Enter") {
                  e.preventDefault();
                }
              }}
            />
            <CommandList aria-busy={Boolean(isStale)} aria-label={triggerLabel}>
              {idle ? (
                <div className="text-muted-foreground py-6 text-center text-sm">
                  {hintText}
                </div>
              ) : options.length === 0 && !isFetching ? (
                <CommandEmpty>{emptyText}</CommandEmpty>
              ) : null}
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = value?.value === option.value;
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => {
                        if (isSelected) {
                          onValueChange(null);
                        } else {
                          onValueChange(option);
                        }
                        setOpen(false);
                      }}
                      data-test={`combobox-item-${option.value}`}
                    >
                      <CheckIcon
                        aria-hidden="true"
                        className={cn(
                          "text-primary size-4 shrink-0",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">{option.label}</span>
                      {isSelected && <span className="sr-only">selected</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
            {!isStale && (
              <span className="sr-only" role="status" aria-live="polite">
                {idle ? hintText : `${options.length} results`}
              </span>
            )}
            {typeof total === "number" && total > options.length ? (
              <div className="text-muted-foreground border-t p-2 text-center text-xs">
                Showing {options.length} of {total}. Keep typing to narrow.
              </div>
            ) : null}
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);

Combobox.displayName = "Combobox";
