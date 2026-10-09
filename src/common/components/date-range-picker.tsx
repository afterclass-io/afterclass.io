"use client";

import { useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";

import { Button } from "@/common/components/button";
import { Calendar, type DateRange } from "@/common/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/popover";
import { cn } from "@/common/functions";
import { formatDateRangeSGT } from "@/common/functions/format-date-range-sgt";
import {
  addDaysIso,
  countDaysInclusive,
  type IsoDateRange,
} from "@/common/functions/term-date-bounds";

export type DateRangePickerProps = {
  value: IsoDateRange;
  onChange: (range: IsoDateRange) => void;
  /** Earliest selectable day (`YYYY-MM-DD`). */
  min?: string;
  /** Latest selectable day (`YYYY-MM-DD`). */
  max?: string;
  /** Longest selectable range, in days. */
  maxDays?: number;
  /** Range lengths, in days, offered as shortcuts that start from the current start date. */
  presets?: number[];
  disabled?: boolean;
  id?: string;
  className?: string;
};

const toIso = (d: Date) => format(d, "yyyy-MM-dd");

function toDayPickerRange(range: IsoDateRange): DateRange {
  return { from: parseISO(range.start), to: parseISO(range.end) };
}

function describeRange(range: IsoDateRange): string {
  const days = countDaysInclusive(range);
  const label = formatDateRangeSGT(
    `${range.start}T00:00:00Z`,
    `${range.end}T00:00:00Z`,
  );
  return `${label} (${days} ${days === 1 ? "day" : "days"})`;
}

/**
 * Popover date-range field. A range is committed to `onChange` only once both
 * ends are picked, so the parent never sees a half-finished selection.
 */
export function DateRangePicker({
  value,
  onChange,
  min,
  max,
  maxDays,
  presets = [],
  disabled = false,
  id,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(
    toDayPickerRange(value),
  );
  const [month, setMonth] = useState<Date>(() => parseISO(value.start));

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDraft(toDayPickerRange(value));
      setMonth(parseISO(value.start));
    }
    setOpen(next);
  };

  const handleSelect = (next: DateRange | undefined) => {
    setDraft(next);
    if (next?.from && next.to) {
      onChange({ start: toIso(next.from), end: toIso(next.to) });
    }
  };

  const applyPreset = (days: number) => {
    const start = draft?.from ? toIso(draft.from) : value.start;
    const rawEnd = addDaysIso(start, days - 1);
    const end = max && rawEnd > max ? max : rawEnd;
    const newRange: IsoDateRange = { start, end };
    onChange(newRange);
    setDraft(toDayPickerRange(newRange));
    setMonth(parseISO(start));
  };

  // While the second end is being picked, keep the range inside `maxDays`.
  const pendingStart = draft?.from && !draft.to ? draft.from : null;
  const disabledDays = [
    ...(min ? [{ before: parseISO(min) }] : []),
    ...(max ? [{ after: parseISO(max) }] : []),
    ...(pendingStart && maxDays
      ? [
          { before: addDays(pendingStart, -(maxDays - 1)) },
          { after: addDays(pendingStart, maxDays - 1) },
        ]
      : []),
  ];

  const activeDays =
    draft?.from && draft?.to
      ? countDaysInclusive({ start: toIso(draft.from), end: toIso(draft.to) })
      : undefined;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start gap-2 px-3 text-sm font-normal",
            className,
          )}
        >
          <CalendarDays className="text-muted-foreground size-4" />
          {describeRange(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto overflow-hidden rounded-xl border p-0 shadow-lg"
      >
        <Calendar
          mode="range"
          resetOnSelect
          selected={draft}
          onSelect={handleSelect}
          month={month}
          onMonthChange={setMonth}
          startMonth={min ? parseISO(min) : undefined}
          endMonth={max ? parseISO(max) : undefined}
          disabled={disabledDays}
          className="w-full min-w-[17.5rem] rounded-none border-0 bg-transparent shadow-none"
        />

        {presets.length > 0 && (
          <div className="border-border/60 bg-muted/20 border-t px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground mr-1 text-[11px] font-medium select-none">
                Duration:
              </span>
              {presets.map((days) => {
                const isActive = activeDays === days;
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => applyPreset(days)}
                    className={cn(
                      "focus-visible:ring-ring h-6 cursor-pointer rounded-full px-2.5 text-xs font-medium transition-colors select-none focus-visible:ring-1 focus-visible:outline-none",
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "bg-background text-muted-foreground border-border/70 hover:bg-muted hover:text-foreground hover:border-border border",
                    )}
                  >
                    {days} days
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="border-border/60 bg-muted/10 flex items-center justify-between gap-3 border-t px-3 py-2">
          <div className="text-muted-foreground min-w-0 truncate text-xs">
            {draft?.from && draft?.to ? (
              <span className="text-foreground font-medium">
                {describeRange({
                  start: toIso(draft.from),
                  end: toIso(draft.to),
                })}
              </span>
            ) : draft?.from ? (
              <span className="text-muted-foreground italic">
                Select end date...
              </span>
            ) : (
              <span>{describeRange(value)}</span>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            className="h-7 cursor-pointer px-3 text-xs font-medium"
            onClick={() => setOpen(false)}
            disabled={Boolean(draft?.from && !draft?.to)}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
