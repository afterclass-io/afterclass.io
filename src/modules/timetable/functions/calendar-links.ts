/**
 * Pure helpers for the calendar export ("Add to calendar") popover.
 */

/**
 * Error message for a PRIVATE timetable that asks for a calendar link. The
 * server throws it; the popover and the MCP tool match it to offer the
 * link-sharing opt-in instead of a plain error.
 */
export const LINK_SHARING_REQUIRED_MESSAGE =
  "Set your timetable to link-sharing before creating a calendar link";

export type CalendarLinks = {
  /** Plain https URL — the feed URL for web calendars ("Add from URL" in
   *  Google Calendar) and the one-off .ics download. */
  feedUrl: string;
  /** webcal:// URL — opens desktop calendar apps (Apple Calendar, Outlook)
   *  directly. Web calendars generally expect the https `feedUrl` instead. */
  subscribeUrl: string;
  /** Google Calendar one-step subscribe — uses the https `feedUrl` in `cid`
   *  (Google stores the URL verbatim; webcal fails to sync). */
  googleSubscribeUrl: string;
  appleSubscribeUrl: string;
  outlookSubscribeUrl: string;
};

/**
 * Build the feed and subscription URLs for an iCal token.
 *
 * `subscribeUrl` swaps the http(s) scheme for `webcal://`, which Apple
 * Calendar (and similar desktop apps) register as their subscription protocol.
 * Google Calendar expects the plain https `feedUrl` in `cid`; passing the
 * webcal URL causes the subscription to sync empty. Outlook uses the https
 * `feedUrl` in `url`.
 */
export function buildCalendarLinks(
  origin: string,
  token: string,
): CalendarLinks {
  const feedUrl = `${origin}/api/ical/${token}.ics`;
  const subscribeUrl = feedUrl.replace(/^https?:\/\//, "webcal://");
  return {
    feedUrl,
    subscribeUrl,
    googleSubscribeUrl: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`,
    appleSubscribeUrl: subscribeUrl,
    outlookSubscribeUrl: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feedUrl)}`,
  };
}
