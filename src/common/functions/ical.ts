import ical, { ICalCalendarMethod } from "ical-generator";

export type GenericCalendarEvent = {
  id?: string;
  start: Date | string;
  end: Date | string;
  summary: string;
  description?: string;
  location?: string;
  timezone?: string;
};

export type CreateIcsFeedOptions = {
  name?: string;
  product?: string;
  events: GenericCalendarEvent[];
};

/**
 * Creates an RFC 5545 compliant iCalendar (.ics) string using ical-generator.
 * Default timezone is Asia/Singapore.
 */
export function createIcsFeed(options: CreateIcsFeedOptions): string {
  const cal = ical({
    name: options.name,
    prodId: { company: "afterclass.io", product: options.product ?? "calendar" },
    timezone: "Asia/Singapore",
    method: ICalCalendarMethod.PUBLISH,
  });

  for (const ev of options.events) {
    cal.createEvent({
      id: ev.id,
      start: typeof ev.start === "string" ? new Date(ev.start) : ev.start,
      end: typeof ev.end === "string" ? new Date(ev.end) : ev.end,
      summary: ev.summary,
      description: ev.description,
      location: ev.location,
      timezone: ev.timezone ?? "Asia/Singapore",
    });
  }

  return cal.toString();
}
