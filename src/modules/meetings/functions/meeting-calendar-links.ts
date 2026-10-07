/**
 * Pure helpers for meeting calendar links (Google Calendar, Outlook, and RFC 5545 .ics download).
 *
 * Modeled on the timetable module's calendar export patterns.
 */

export type MeetingCalendarParams = {
  title: string;
  start: Date | string;
  end: Date | string;
  description?: string | null;
  uid?: string;
};

/**
 * Format a Date to RFC 5545 UTC timestamp: YYYYMMDDTHHmmssZ
 */
export function formatIcsDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Escape text for RFC 5545 format:
 * Backslash, semicolon, comma, and newlines must be escaped.
 */
export function escapeIcsText(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

/**
 * Generates direct Google Calendar "Add Event" URL.
 */
export function generateGoogleCalendarMeetingUrl(
  params: MeetingCalendarParams,
): string {
  const { title, start, end, description } = params;

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", title);
  url.searchParams.set("dates", `${formatIcsDate(start)}/${formatIcsDate(end)}`);

  if (description) {
    url.searchParams.set("details", description);
  }

  return url.toString();
}

/**
 * Generates direct Outlook Live Calendar "Add Event" deep link URL.
 */
export function generateOutlookCalendarMeetingUrl(
  params: MeetingCalendarParams,
): string {
  const { title, start, end, description } = params;
  const startDate = typeof start === "string" ? new Date(start) : start;
  const endDate = typeof end === "string" ? new Date(end) : end;

  const url = new URL("https://outlook.live.com/calendar/0/deeplink/compose");
  url.searchParams.set("path", "/calendar/action/compose");
  url.searchParams.set("rru", "addevent");
  url.searchParams.set("subject", title);
  url.searchParams.set("startdt", startDate.toISOString());
  url.searchParams.set("enddt", endDate.toISOString());

  if (description) {
    url.searchParams.set("body", description);
  }

  return url.toString();
}

import { createIcsFeed } from "@/common/functions/ical";

/**
 * Generates raw RFC 5545 .ics VCALENDAR string for a meeting event using ical-generator.
 */
export function generateIcsMeetingContent(
  params: MeetingCalendarParams,
): string {
  const { title, start, end, description, uid } = params;

  return createIcsFeed({
    product: "Meeting Coordinator",
    events: [
      {
        id: uid ? `${uid}@afterclass.io` : `meeting-${Date.now()}@afterclass.io`,
        start,
        end,
        summary: title,
        description: description ?? undefined,
      },
    ],
  });
}

/**
 * Generates data:text/calendar Data URL for immediate in-browser download of the meeting .ics file.
 */
export function generateIcsMeetingDataUrl(
  params: MeetingCalendarParams,
): string {
  const icsContent = generateIcsMeetingContent(params);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
}

/**
 * Builds all calendar export links for a meeting time.
 */
export function buildMeetingCalendarLinks(params: MeetingCalendarParams) {
  return {
    googleUrl: generateGoogleCalendarMeetingUrl(params),
    outlookUrl: generateOutlookCalendarMeetingUrl(params),
    icsDataUrl: generateIcsMeetingDataUrl(params),
  };
}
