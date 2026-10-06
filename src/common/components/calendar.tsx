"use client";

import * as React from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  isBefore,
  isAfter,
  format,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/common/functions";

export type DateRange = { from?: Date; to?: Date };

export type CalendarProps = {
  className?: string;
  resetOnSelect?: boolean;
  defaultMonth?: Date;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  startMonth?: Date;
  endMonth?: Date;
  disabled?:
    | ((date: Date) => boolean)
    | { before?: Date; after?: Date }
    | Array<{ before?: Date; after?: Date } | ((date: Date) => boolean)>;
} & (
  | {
      mode?: "single";
      selected?: Date;
      onSelect?: (date: Date | undefined) => void;
    }
  | {
      mode: "range";
      selected?: DateRange;
      onSelect?: (range: DateRange | undefined) => void;
    }
);

export function Calendar(props: CalendarProps) {
  const {
    className,
    mode = "single",
    selected,
    defaultMonth,
    month: controlledMonth,
    onMonthChange,
    startMonth,
    endMonth,
    disabled,
  } = props;
  const [currentMonth, setCurrentMonth] = React.useState<Date>(() => {
    if (controlledMonth) return controlledMonth;
    if (defaultMonth) return defaultMonth;
    if (mode === "single" && selected instanceof Date) return selected;
    if (mode === "range" && (selected as DateRange)?.from) {
      return (selected as DateRange).from!;
    }
    return new Date();
  });

  const activeMonth = controlledMonth ?? currentMonth;
  const today = React.useMemo(() => new Date(), []);

  const setViewMonth = (next: Date) => {
    if (!controlledMonth) setCurrentMonth(next);
    onMonthChange?.(next);
  };

  const canPrevMonth = React.useMemo(() => {
    if (!startMonth) return true;
    return isAfter(startOfMonth(activeMonth), startOfMonth(startMonth));
  }, [activeMonth, startMonth]);

  const canNextMonth = React.useMemo(() => {
    if (!endMonth) return true;
    return isBefore(endOfMonth(activeMonth), endOfMonth(endMonth));
  }, [activeMonth, endMonth]);

  const prevMonth = () => {
    if (canPrevMonth) setViewMonth(subMonths(activeMonth, 1));
  };
  const nextMonth = () => {
    if (canNextMonth) setViewMonth(addMonths(activeMonth, 1));
  };

  // Determine days in the grid for activeMonth
  const monthStart = startOfMonth(activeMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = React.useMemo(
    () => eachDayOfInterval({ start: startDate, end: endDate }),
    [startDate, endDate],
  );

  const isDayDisabled = (d: Date): boolean => {
    if (!disabled) return false;
    const checks = Array.isArray(disabled) ? disabled : [disabled];
    return checks.some((check) => {
      if (typeof check === "function") return check(d);
      if (check.before && isBefore(d, check.before)) return true;
      if (check.after && isAfter(d, check.after)) return true;
      return false;
    });
  };

  const range = mode === "range" ? (selected as DateRange | undefined) : undefined;
  const single = mode === "single" ? (selected as Date | undefined) : undefined;

  const handleDayClick = (d: Date) => {
    if (isDayDisabled(d)) return;
    if (props.mode === "range") {
      const onRangeSelect = props.onSelect;
      if (!range?.from || (range.from && range.to)) {
        // Start new range
        onRangeSelect?.({ from: d, to: undefined });
      } else if (range.from && !range.to) {
        if (isBefore(d, range.from)) {
          // If clicked before from, reset from
          onRangeSelect?.({ from: d, to: undefined });
        } else {
          onRangeSelect?.({ from: range.from, to: d });
        }
      }
    } else {
      props.onSelect?.(d);
    }
  };

  const weekDayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div
      data-slot="calendar"
      className={cn(
        "bg-background p-3 rounded-xl border shadow-xs w-fit select-none",
        className,
      )}
    >
      {/* Month Navigation */}
      <div className="flex items-center justify-between px-1 pb-3">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canPrevMonth}
          aria-label="Previous month"
          className={cn(
            "size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            !canPrevMonth && "opacity-25 cursor-not-allowed pointer-events-none",
          )}
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold text-foreground tracking-tight select-none">
          {format(activeMonth, "MMMM yyyy")}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          disabled={!canNextMonth}
          aria-label="Next month"
          className={cn(
            "size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            !canNextMonth && "opacity-25 cursor-not-allowed pointer-events-none",
          )}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 text-center pb-1">
        {weekDayLabels.map((w) => (
          <div
            key={w}
            className="h-8 flex items-center justify-center text-[11px] font-semibold text-muted-foreground/80 tracking-wide uppercase"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-1 gap-x-0">
        {days.map((d, index) => {
          const colIndex = index % 7;
          const isCurrentMonth = isSameMonth(d, activeMonth);
          const isDisabled = isDayDisabled(d);
          const isToday = isSameDay(d, today);

          let isSelected = false;
          let isRangeStart = false;
          let isRangeEnd = false;
          let isInRange = false;

          if (mode === "single" && single) {
            isSelected = isSameDay(d, single);
          } else if (mode === "range" && range) {
            if (range.from && isSameDay(d, range.from)) {
              isRangeStart = true;
              isSelected = true;
            }
            if (range.to && isSameDay(d, range.to)) {
              isRangeEnd = true;
              isSelected = true;
            }
            if (
              range.from &&
              range.to &&
              isWithinInterval(d, { start: range.from, end: range.to })
            ) {
              isInRange = true;
            }
          }

          const hasRangeBoth = Boolean(range?.from && range?.to);
          const isSingleSelectedDay = isRangeStart && isRangeEnd;

          return (
            <div
              key={d.toISOString()}
              className="relative h-9 w-full flex items-center justify-center p-0"
            >
              {/* Continuous Range Background Ribbon */}
              {isInRange && hasRangeBoth && !isSingleSelectedDay && (
                <div
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-1 bg-primary/15 pointer-events-none transition-colors",
                    // Start of range: ribbon starts at center and spans to right edge
                    isRangeStart && "left-1/2 right-0 rounded-l-full",
                    // End of range: ribbon starts at left edge and spans to center
                    isRangeEnd && "left-0 right-1/2 rounded-r-full",
                    // Middle of range: spans entire cell
                    !isRangeStart && !isRangeEnd && "left-0 right-0",
                    // Row wrapping boundary caps: Sunday rounds left, Saturday rounds right
                    colIndex === 0 && !isRangeStart && "rounded-l-full",
                    colIndex === 6 && !isRangeEnd && "rounded-r-full",
                  )}
                />
              )}

              {/* Interactive Date Button */}
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => handleDayClick(d)}
                className={cn(
                  "relative z-10 size-8 text-xs font-medium flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  // Selected endpoint styling (solid purple circle with crisp contrast)
                  isSelected
                    ? "rounded-full bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary"
                    : isInRange
                    ? "rounded-full text-primary font-semibold hover:bg-primary/25"
                    : isCurrentMonth
                    ? "rounded-full text-foreground hover:bg-muted"
                    : "rounded-full text-muted-foreground/30 hover:bg-muted/40",
                  // Today marker when not currently selected
                  isToday && !isSelected && "font-bold text-primary ring-1 ring-primary/40",
                  isDisabled && "opacity-25 cursor-not-allowed pointer-events-none",
                )}
              >
                {d.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
