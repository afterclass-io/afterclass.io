import { describe, expect, it } from "vitest";
import {
  buildMeetingCalendarLinks,
  escapeIcsText,
  formatIcsDate,
  generateGoogleCalendarMeetingUrl,
  generateIcsMeetingContent,
  generateIcsMeetingDataUrl,
  generateOutlookCalendarMeetingUrl,
} from "./meeting-calendar-links";

describe("meeting-calendar-links", () => {
  const sampleMeeting = {
    title: "IS216 Project Meeting: Milestone 1",
    start: new Date(Date.UTC(2026, 9, 12, 6, 0, 0)), // 2026-10-12 06:00:00 UTC (14:00 SGT)
    end: new Date(Date.UTC(2026, 9, 12, 7, 30, 0)), // 2026-10-12 07:30:00 UTC (15:30 SGT)
    description: "Review prototype architecture and plan user tests.",
    uid: "test-uid-123",
  };

  describe("formatIcsDate", () => {
    it("formats dates to RFC 5545 UTC timestamp format", () => {
      const formatted = formatIcsDate(new Date(Date.UTC(2026, 9, 12, 6, 15, 0)));
      expect(formatted).toBe("20261012T061500Z");
    });
  });

  describe("escapeIcsText", () => {
    it("escapes backslashes, semicolons, commas, and newlines", () => {
      const raw = "Note: A, B; C \\ D\nNext line\r\nAnother line";
      const escaped = escapeIcsText(raw);
      expect(escaped).toBe("Note: A\\, B\\; C \\\\ D\\nNext line\\nAnother line");
    });
  });

  describe("generateGoogleCalendarMeetingUrl", () => {
    it("generates correct Google Calendar URL with encoded parameters", () => {
      const url = generateGoogleCalendarMeetingUrl(sampleMeeting);
      const parsed = new URL(url);

      expect(parsed.origin).toBe("https://calendar.google.com");
      expect(parsed.pathname).toBe("/calendar/render");
      expect(parsed.searchParams.get("action")).toBe("TEMPLATE");
      expect(parsed.searchParams.get("text")).toBe(sampleMeeting.title);
      expect(parsed.searchParams.get("dates")).toBe(
        "20261012T060000Z/20261012T073000Z",
      );

      expect(parsed.searchParams.get("details")).toBe(sampleMeeting.description);
    });

    it("handles minimal parameters without crashing", () => {
      const minimal = {
        title: "Quick Sync",
        start: new Date(Date.UTC(2026, 9, 12, 2, 0, 0)),
        end: new Date(Date.UTC(2026, 9, 12, 3, 0, 0)),
      };
      const url = generateGoogleCalendarMeetingUrl(minimal);
      const parsed = new URL(url);
      expect(parsed.searchParams.get("text")).toBe("Quick Sync");
      expect(parsed.searchParams.get("details")).toBeNull();
    });
  });

  describe("generateOutlookCalendarMeetingUrl", () => {
    it("generates correct Outlook Live Calendar deep link URL", () => {
      const url = generateOutlookCalendarMeetingUrl(sampleMeeting);
      const parsed = new URL(url);

      expect(parsed.origin).toBe("https://outlook.live.com");
      expect(parsed.searchParams.get("rru")).toBe("addevent");
      expect(parsed.searchParams.get("subject")).toBe(sampleMeeting.title);
      expect(parsed.searchParams.get("startdt")).toBe(
        sampleMeeting.start.toISOString(),
      );
      expect(parsed.searchParams.get("enddt")).toBe(
        sampleMeeting.end.toISOString(),
      );
      expect(parsed.searchParams.get("body")).toBe(sampleMeeting.description);
    });
  });

  describe("generateIcsMeetingContent & generateIcsMeetingDataUrl", () => {
    it("generates valid RFC 5545 VCALENDAR string with CRLF endings", () => {
      const ics = generateIcsMeetingContent(sampleMeeting);

      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("VERSION:2.0");
      expect(ics).toContain("Meeting Coordinator");
      expect(ics).toContain("BEGIN:VEVENT");
      expect(ics).toContain("UID:test-uid-123@afterclass.io");
      expect(ics).toContain("DTSTART");
      expect(ics).toContain("DTEND");
      expect(ics).toContain(
        "SUMMARY:IS216 Project Meeting: Milestone 1",
      );
      expect(ics).toContain(
        "DESCRIPTION:Review prototype architecture and plan user tests.",
      );
      expect(ics).toContain("END:VEVENT");
      expect(ics).toContain("END:VCALENDAR");
    });

    it("generates a downloadable data URL for ics file", () => {
      const dataUrl = generateIcsMeetingDataUrl(sampleMeeting);
      expect(dataUrl.startsWith("data:text/calendar;charset=utf-8,")).toBe(true);

      const decoded = decodeURIComponent(
        dataUrl.replace("data:text/calendar;charset=utf-8,", ""),
      );
      expect(decoded).toContain("BEGIN:VCALENDAR");
      expect(decoded).toContain("SUMMARY:IS216 Project Meeting: Milestone 1");
    });
  });

  describe("buildMeetingCalendarLinks", () => {
    it("returns bundle of googleUrl, outlookUrl, and icsDataUrl", () => {
      const links = buildMeetingCalendarLinks(sampleMeeting);
      expect(links.googleUrl).toContain("calendar.google.com");
      expect(links.outlookUrl).toContain("outlook.live.com");
      expect(links.icsDataUrl).toContain("data:text/calendar;charset=utf-8");
    });
  });
});
