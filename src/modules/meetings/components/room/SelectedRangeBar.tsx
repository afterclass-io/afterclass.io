"use client";

import { X } from "lucide-react";

import { Button } from "@/common/components/button";
import { formatDateSGT, formatTimeSGT } from "@/common/functions/format-date-sgt";
import { MeetingCalendarExportPopover } from "@/modules/meetings/components/room/MeetingCalendarExportPopover";

export type SelectedRangeBarProps = {
  title: string;
  description: string | null;
  start: Date;
  end: Date;
  free: number;
  maybe: number;
  total: number;
  onClear: () => void;
};

/** Summary of the time range picked in the group view, with the add-to-calendar action. */
export function SelectedRangeBar({
  title,
  description,
  start,
  end,
  free,
  maybe,
  total,
  onClear,
}: SelectedRangeBarProps) {
  return (
    <div
      className="bg-card flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border px-3 py-2"
      data-test="meeting-selected-range-bar"
    >
      <p className="min-w-0 text-sm">
        <span className="font-medium">
          {formatDateSGT(start, {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </span>
        <span className="text-muted-foreground">
          {" · "}
          {formatTimeSGT(start)}–{formatTimeSGT(end)}
          {" · "}
          {free}/{total} free
          {maybe > 0 && ` (+${maybe} if needed)`}
        </span>
      </p>

      <div className="flex items-center gap-1.5">
        <MeetingCalendarExportPopover
          title={title}
          description={description}
          start={start}
          end={end}
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onClear}
          aria-label="Clear selected time"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
