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
        className="w-auto p-0 overflow-hidden shadow-lg border rounded-xl"
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
          className="border-0 shadow-none rounded-none"
        />

        {presets.length > 0 && (
          <div className="border-t border-border/60 bg-muted/20 px-3 py-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-muted-foreground mr-1 select-none">
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
                      "h-6 px-2.5 rounded-full text-xs font-medium transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "bg-background text-muted-foreground border border-border/70 hover:bg-muted hover:text-foreground hover:border-border",
                    )}
                  >
                    {days} days
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/10 px-3 py-2">
          <div className="min-w-0 text-xs text-muted-foreground truncate">
            {draft?.from && draft?.to ? (
              <span className="font-medium text-foreground">
                {describeRange({
                  start: toIso(draft.from),
                  end: toIso(draft.to),
                })}
              </span>
            ) : draft?.from ? (
              <span className="italic text-muted-foreground">
                Select end date...
              </span>
            ) : (
              <span>{describeRange(value)}</span>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            className="h-7 px-3 text-xs font-medium cursor-pointer"
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
