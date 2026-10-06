"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/common/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/common/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/popover";
import { cn } from "@/common/functions";

export type ClassOption = {
  courseId: string;
  code: string;
  name: string;
  section: string;
};

export type ClassSelection = { courseId: string; section: string };

export type ClassPickerProps = {
  classes: ClassOption[];
  value: ClassSelection | null;
  onChange: (value: ClassSelection | null) => void;
  disabled?: boolean;
  id?: string;
};

const MAX_VISIBLE_OPTIONS = 50;

const isSelected = (option: ClassOption, value: ClassSelection | null) =>
  option.courseId === value?.courseId && option.section === value.section;

/** Searchable list of the classes offered this term; picking one sets course and section together. */
export function ClassPicker({
  classes,
  value,
  onChange,
  disabled = false,
  id,
}: ClassPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = useMemo(
    () => classes.find((option) => isSelected(option, value)),
    [classes, value],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return classes.slice(0, MAX_VISIBLE_OPTIONS);
    return classes
      .filter((option) =>
        `${option.code} ${option.section} ${option.name}`
          .toLowerCase()
          .includes(query),
      )
      .slice(0, MAX_VISIBLE_OPTIONS);
  }, [classes, search]);

  const handleSelect = (option: ClassOption) => {
    onChange(
      isSelected(option, value)
        ? null
        : { courseId: option.courseId, section: option.section },
    );
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full min-w-0 justify-between gap-2 overflow-hidden px-3 text-sm font-normal",
            !selected && "text-muted-foreground",
          )}
          data-test="class-picker-trigger"
        >
          {selected ? (
            <span className="flex min-w-0 flex-1 items-baseline gap-1.5 text-left">
              <span className="shrink-0 font-medium">
                {selected.code} · {selected.section}
              </span>
              <span className="text-muted-foreground min-w-0 truncate">
                {selected.name}
              </span>
            </span>
          ) : (
            "Search this term's classes"
          )}
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-(--radix-popover-trigger-width) min-w-72 p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Course code, section or title"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-64">
            <CommandEmpty>No classes found.</CommandEmpty>
            <CommandGroup>
              {visible.map((option) => (
                <CommandItem
                  key={`${option.courseId}:${option.section}`}
                  value={`${option.courseId}:${option.section}`}
                  onSelect={() => handleSelect(option)}
                  className="min-w-0 gap-2"
                >
                  <span className="shrink-0 font-medium">
                    {option.code} · {option.section}
                  </span>
                  <span className="text-muted-foreground min-w-0 truncate">
                    {option.name}
                  </span>
                  {isSelected(option, value) && (
                    <Check className="text-primary ml-auto size-4 shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
