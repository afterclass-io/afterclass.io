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
  /** One-step subscribe URLs for the major calendar apps. */
  googleSubscribeUrl: string;
  appleSubscribeUrl: string;
  outlookSubscribeUrl: string;
};

/**
 * Build the feed and subscription URLs for an iCal token.
 *
 * `subscribeUrl` swaps the http(s) scheme for `webcal://`, which calendar
 * apps register as their subscription protocol. The Google / Apple / Outlook
 * one-step URLs reuse it (or the plain `feedUrl`) inside each app's own
 * subscribe flow.
 */
export function buildCalendarLinks(
  origin: string,
  token: string,
): CalendarLinks {
  const feedUrl = `${origin}/api/ical/${token}`;
  const subscribeUrl = feedUrl.replace(/^https?:\/\//, "webcal://");
  return {
    feedUrl,
    subscribeUrl,
    googleSubscribeUrl: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(subscribeUrl)}`,
    appleSubscribeUrl: subscribeUrl,
    outlookSubscribeUrl: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feedUrl)}`,
  };
}
