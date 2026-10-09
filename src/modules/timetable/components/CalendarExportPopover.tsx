"use client";

import { useEffect, useState } from "react";
import {
  Apple,
  CalendarPlus,
  Chrome,
  Copy,
  Download,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/common/tools/trpc/react";
import { useCopyToClipboard } from "@/common/hooks/use-copy-to-clipboard";
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
import {
  buildCalendarLinks,
  LINK_SHARING_REQUIRED_MESSAGE,
} from "@/modules/timetable/functions/calendar-links";

export type CalendarExportPopoverProps = {
  timetableId: string;
};

// ---------------------------------------------------------------------------
// View (presentational — storybookable without tRPC)
// ---------------------------------------------------------------------------

export type CalendarExportPopoverViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The timetable's iCal token, or null before it has been minted. */
  token: string | null;
  /** `window.location.origin` at mount time — base for the feed URLs. */
  origin: string;
  /** True when the timetable is PRIVATE, so link-sharing must be turned on
   *  before a calendar link can be created. */
  needsLinkSharing: boolean;
  /** True while "Turn on link sharing" is saving. */
  isTurningOnLinkSharing: boolean;
  /** True while the calendar link is being revoked. */
  isRevoking: boolean;
  /** True while the calendar link is being rotated. */
  isRotating: boolean;
  /** Called when the user opts into link-sharing (UNLISTED visibility). */
  onTurnOnLinkSharing: () => void;
  /** Called when the user revokes the calendar feed token. */
  onRevoke: () => void;
  /** Called when the user rotates the calendar feed token. */
  onRotate: () => void;
};

/**
 * Presentational "Add to calendar" popover. Owns no data-fetching state:
 * the connected `CalendarExportPopover` feeds it the token/notice state and
 * mutation callbacks, which lets Storybook render it without a live tRPC
 * backend.
 *
 * Fetches (creating on first use) the timetable's iCal feed token and
 * offers the ways to consume the `GET /api/ical/[token]` feed:
 *
 * - Feed URL (https) with copy-to-clipboard — the primary affordance:
 *   this is what "Add from URL" in Google Calendar (and other web
 *   calendars) expects, and it keeps the calendar in sync.
 * - One-step subscribe buttons for Google, Apple and Outlook calendars.
 * - "Download .ics" — a one-off import.
 *
 * When the timetable is PRIVATE, the token mint is refused server-side, so
 * the view shows an inline "Turn on link sharing" notice with a one-click
 * action instead of a dead-end error.
 *
 * When the site runs on localhost, a hint warns that external calendar
 * services can't reach the feed and it must be subscribed from a
 * deployed URL.
 */
export function CalendarExportPopoverView({
  open,
  onOpenChange,
  token,
  origin,
  needsLinkSharing,
  isTurningOnLinkSharing,
  isRevoking,
  isRotating,
  onTurnOnLinkSharing,
  onRevoke,
  onRotate,
}: CalendarExportPopoverViewProps) {
  const { copy } = useCopyToClipboard();
  const [isConfirmingRotate, setIsConfirmingRotate] = useState(false);
  const [prevToken, setPrevToken] = useState(token);
  const [prevOpen, setPrevOpen] = useState(open);

  if (token !== prevToken) {
    setPrevToken(token);
    setIsConfirmingRotate(false);
  }

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setIsConfirmingRotate(false);
    }
  }

  const links = token ? buildCalendarLinks(origin, token) : null;

  const isLocalhost =
    origin.includes("//localhost") || origin.includes("//127.0.0.1");

  const handleCopyFeedUrl = async () => {
    if (!links) return;
    await copy(links.feedUrl, {
      successMessage:
        'Feed URL copied — paste it into your calendar\'s "Add from URL"',
      errorMessage: "Failed to copy link",
    });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setIsConfirmingRotate(false);
    }
    onOpenChange(next);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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

          {needsLinkSharing ? (
            <div
              className="border-border flex flex-col gap-2 rounded-md border p-3 text-sm"
              data-test="calendar-needs-link-sharing"
            >
              <p className="text-muted-foreground">
                Calendar links need link-sharing turned on for this timetable.
              </p>
              <Button
                size="sm"
                disabled={isTurningOnLinkSharing}
                onClick={onTurnOnLinkSharing}
                data-test="calendar-turn-on-link-sharing"
              >
                {isTurningOnLinkSharing && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Turn on link sharing
              </Button>
            </div>
          ) : !links ? (
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

              {/* Secondary: one-step subscribe into the major calendar apps.
                  Google and Outlook open their own web flows; Apple handles
                  the webcal:// scheme natively. */}
              <Button variant="outline" size="sm" asChild>
                <a
                  href={links.googleSubscribeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-test="calendar-subscribe-google"
                >
                  <Chrome className="size-4" />
                  Subscribe in Google Calendar
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={links.appleSubscribeUrl}
                  data-test="calendar-subscribe-apple"
                >
                  <Apple className="size-4" />
                  Subscribe in Apple Calendar
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={links.outlookSubscribeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-test="calendar-subscribe-outlook"
                >
                  <Mail className="size-4" />
                  Subscribe in Outlook Calendar
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={links.feedUrl}
                  download
                  data-test="calendar-download-ics"
                >
                  <Download className="size-4" />
                  Download .ics
                </a>
              </Button>

              {isLocalhost && (
                <p className="text-muted-foreground text-xs">
                  You&apos;re on localhost — external calendar services (like
                  Google Calendar) can&apos;t reach this URL. Subscribe from the
                  deployed site instead.
                </p>
              )}

              <div className="border-border border-t pt-2">
                {isConfirmingRotate ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-muted-foreground text-xs">
                      Your current link stops working. Anyone subscribed must
                      add the new link.
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsConfirmingRotate(false)}
                        disabled={isRotating}
                        data-test="calendar-rotate-cancel"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={onRotate}
                        disabled={isRotating}
                        data-test="calendar-rotate-confirm"
                      >
                        {isRotating && (
                          <Loader2 className="size-3.5 animate-spin" />
                        )}
                        Confirm
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => setIsConfirmingRotate(true)}
                      disabled={isRotating || isRevoking}
                      aria-label="Rotate calendar link"
                      data-test="calendar-rotate-button"
                    >
                      <RefreshCw
                        className={`size-4 ${isRotating ? "animate-spin" : ""}`}
                      />
                      Rotate link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive flex-1"
                      onClick={onRevoke}
                      disabled={isRevoking || isRotating}
                      data-test="calendar-revoke-button"
                    >
                      Revoke link
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Connected wrapper
// ---------------------------------------------------------------------------

/**
 * Connected "Add to calendar" popover for the timetable page.
 *
 * Mints the timetable's iCal feed token on first open. If the timetable is
 * PRIVATE the mint is refused (`BAD_REQUEST`), so instead of a dead-end
 * error toast the popover shows an inline "Turn on link sharing" notice;
 * opting in sets the timetable to UNLISTED via `api.sharing.setVisibility`
 * and retries the mint.
 */
export function CalendarExportPopover({
  timetableId,
}: CalendarExportPopoverProps) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [needsLinkSharing, setNeedsLinkSharing] = useState(false);

  const utils = api.useUtils();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-once window read (SSR-unsafe to init lazily); fires once, no cascade
    setOrigin(window.location.origin);
  }, []);

  const tokenMutation = api.timetable.getOrCreateIcalToken.useMutation({
    onSuccess: (data) => setToken(data.icalToken),
    onError: (error) => {
      // A PRIVATE timetable refuses to mint a token; surface an inline
      // "turn on link sharing" action instead of a dead-end error toast.
      if (
        error.data?.code === "BAD_REQUEST" &&
        error.message === LINK_SHARING_REQUIRED_MESSAGE
      ) {
        setNeedsLinkSharing(true);
        return;
      }
      toast.error(`Failed to create calendar link: ${error.message}`);
    },
  });

  const revokeMutation = api.timetable.revokeIcalToken.useMutation({
    onSuccess: () => {
      setToken(null);
      toast.success("Calendar link revoked");
    },
    onError: (error) => toast.error(`Failed to revoke: ${error.message}`),
  });

  const rotateMutation = api.timetable.rotateIcalToken.useMutation({
    onSuccess: (data) => {
      setToken(data.icalToken);
      toast.success("Calendar link rotated");
    },
    onError: (error) => toast.error(`Failed to rotate: ${error.message}`),
  });

  const setVisibilityMutation = api.sharing.setVisibility.useMutation({
    onSuccess: () => {
      setNeedsLinkSharing(false);
      // Refresh whatever query feeds the timetable's visibility display
      // (mirrors ShareDialog's invalidation).
      void utils.timetable.invalidate();
      // The timetable is now UNLISTED — retry minting the iCal token.
      tokenMutation.mutate({ timetableId });
    },
    onError: (error) =>
      toast.error(`Failed to update sharing: ${error.message}`),
  });

  // Mint the token the first time the popover opens.
  useEffect(() => {
    if (open && !token && !tokenMutation.isPending) {
      tokenMutation.mutate({ timetableId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, timetableId]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // Drop the "needs link sharing" notice when the popover closes, so the
    // next open re-checks the timetable's current visibility.
    if (!next) {
      setNeedsLinkSharing(false);
    }
  };

  return (
    <CalendarExportPopoverView
      open={open}
      onOpenChange={handleOpenChange}
      token={token}
      origin={origin}
      needsLinkSharing={needsLinkSharing}
      isTurningOnLinkSharing={setVisibilityMutation.isPending}
      isRevoking={revokeMutation.isPending}
      isRotating={rotateMutation.isPending}
      onTurnOnLinkSharing={() =>
        setVisibilityMutation.mutate({
          entity: "timetable",
          id: timetableId,
          visibility: "UNLISTED",
        })
      }
      onRevoke={() => revokeMutation.mutate({ timetableId })}
      onRotate={() => rotateMutation.mutate({ timetableId })}
    />
  );
}
