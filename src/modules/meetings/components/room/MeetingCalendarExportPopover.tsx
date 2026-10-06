"use client";

import { CalendarPlus, ChevronDown, Chrome, Download, Mail } from "lucide-react";

import { Button } from "@/common/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/popover";
import { formatDateSGT, formatTimeSGT } from "@/common/functions/format-date-sgt";
import {
  buildMeetingCalendarLinks,
  type MeetingCalendarParams,
} from "@/modules/meetings/functions/meeting-calendar-links";

export type MeetingCalendarExportPopoverProps = Pick<
  MeetingCalendarParams,
  "title" | "start" | "end" | "description"
>;

/**
 * "Add to calendar" popover for a chosen meeting time: Google Calendar,
 * Outlook, or an RFC 5545 .ics download (Apple Calendar and desktop apps).
 */
export function MeetingCalendarExportPopover(
  params: MeetingCalendarExportPopoverProps,
) {
  const { title, start, end } = params;
  const links = buildMeetingCalendarLinks(params);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          className="gap-1.5"
          data-test="meeting-calendar-export-button"
        >
          <CalendarPlus className="size-4" />
          Add to calendar
          <ChevronDown className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 p-3">
        <div>
          <h4 className="text-foreground text-sm leading-tight font-semibold">
            {title}
          </h4>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {formatDateSGT(start, {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}{" "}
            · {formatTimeSGT(start)}–{formatTimeSGT(end)} SGT
          </p>
        </div>

        <div className="space-y-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-full justify-start gap-2 text-xs"
            asChild
          >
            <a
              href={links.googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-test="meeting-export-google"
            >
              <Chrome className="size-3.5" />
              Google Calendar
            </a>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-full justify-start gap-2 text-xs"
            asChild
          >
            <a
              href={links.outlookUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-test="meeting-export-outlook"
            >
              <Mail className="size-3.5" />
              Outlook Calendar
            </a>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-full justify-start gap-2 text-xs"
            asChild
          >
            <a
              href={links.icsDataUrl}
              download={`${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.ics`}
              data-test="meeting-export-ics"
            >
              <Download className="size-3.5" />
              Download .ics (Apple Calendar)
            </a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
