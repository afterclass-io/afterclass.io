/**
 * Pure helpers for the calendar export ("Add to calendar") popover.
 */

export type CalendarLinks = {
  /** Plain https URL — the feed URL for web calendars ("Add from URL" in
   *  Google Calendar) and the one-off .ics download. */
  feedUrl: string;
  /** webcal:// URL — opens desktop calendar apps (Apple Calendar, Outlook)
   *  directly. Web calendars generally expect the https `feedUrl` instead. */
  subscribeUrl: string;
};

/**
 * Build the feed and subscription URLs for an iCal token.
 *
 * `subscribeUrl` swaps the http(s) scheme for `webcal://`, which calendar
 * apps register as their subscription protocol.
 */
export function buildCalendarLinks(
  origin: string,
  token: string,
): CalendarLinks {
  const feedUrl = `${origin}/api/ical/${token}`;
  return {
    feedUrl,
    subscribeUrl: feedUrl.replace(/^https?:\/\//, "webcal://"),
  };
}
