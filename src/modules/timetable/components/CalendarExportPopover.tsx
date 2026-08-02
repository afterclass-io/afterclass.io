"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Copy, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/common/tools/trpc/react";
import { Button } from "@/common/components/button";
import { Input } from "@/common/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import { buildCalendarLinks } from "@/modules/timetable/functions/calendar-links";

export type CalendarExportPopoverProps = {
  timetableId: string;
};

/**
 * Compact "Add to calendar" popover for the timetable page.
 *
 * Fetches (creating on first use) the timetable's iCal feed token and
 * offers the ways to consume the `GET /api/ical/[token]` feed:
 *
 * - Feed URL (https) with copy-to-clipboard — the primary affordance:
 *   this is what "Add from URL" in Google Calendar (and other web
 *   calendars) expects, and it keeps the calendar in sync.
 * - "Subscribe in a calendar app" — a webcal:// link that opens desktop
 *   calendar apps (Apple Calendar, Outlook) directly.
 * - "Download .ics" — a one-off import.
 *
 * When the site runs on localhost, a hint warns that external calendar
 * services can't reach the feed and it must be subscribed from a
 * deployed URL.
 */
export function CalendarExportPopover({
  timetableId,
}: CalendarExportPopoverProps) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const tokenMutation = api.timetable.getOrCreateIcalToken.useMutation({
    onSuccess: (data) => setToken(data.icalToken),
    onError: (error) => {
      toast.error(`Failed to create calendar link: ${error.message}`);
    },
  });

  // Mint the token the first time the popover opens.
  useEffect(() => {
    if (open && !token && !tokenMutation.isPending) {
      tokenMutation.mutate({ timetableId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, timetableId]);

  const links = token ? buildCalendarLinks(origin, token) : null;

  const isLocalhost =
    origin.includes("//localhost") || origin.includes("//127.0.0.1");

  const handleCopyFeedUrl = async () => {
    if (!links) return;
    try {
      await navigator.clipboard.writeText(links.feedUrl);
      toast.success("Feed URL copied — paste it into your calendar's \"Add from URL\"");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              data-test="calendar-export-button"
              aria-label="Add to calendar"
            >
              <CalendarPlus className="size-4" />
              <span className="hidden sm:inline">Add to calendar</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Add to calendar</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-80">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium">Add to calendar</p>
            <p className="text-muted-foreground text-xs">
              Subscribe to keep your timetable in sync, or download a one-off
              .ics file.
            </p>
          </div>

          {!links ? (
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Loader2 className="size-3.5 animate-spin" />
              Preparing your calendar link…
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Primary: the https feed URL — what Google Calendar's
                  "Add from URL" (and other web calendars) expect. */}
              <div className="flex items-center gap-1.5">
                <Input
                  readOnly
                  value={links.feedUrl}
                  onFocus={(e) => e.target.select()}
                  className="h-8 text-xs"
                  aria-label="Calendar feed URL"
                  data-test="calendar-feed-url"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={handleCopyFeedUrl}
                  data-test="calendar-copy-subscribe"
                >
                  <Copy className="size-4" />
                  Copy
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Paste this URL into your calendar&apos;s &quot;Add from
                URL&quot; (e.g. Google Calendar) to subscribe.
              </p>

              {/* Secondary: webcal:// opens desktop calendar apps directly. */}
              <Button variant="outline" size="sm" asChild>
                <a
                  href={links.subscribeUrl}
                  data-test="calendar-subscribe-webcal"
                >
                  <CalendarPlus className="size-4" />
                  Subscribe in a calendar app
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={links.feedUrl} download data-test="calendar-download-ics">
                  <Download className="size-4" />
                  Download .ics
                </a>
              </Button>

              {isLocalhost && (
                <p className="text-muted-foreground text-xs">
                  You&apos;re on localhost — external calendar services (like
                  Google Calendar) can&apos;t reach this URL. Subscribe from
                  the deployed site instead.
                </p>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
