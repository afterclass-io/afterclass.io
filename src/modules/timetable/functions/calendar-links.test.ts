import { describe, expect, it } from "vitest";

import { buildCalendarLinks } from "./calendar-links";

describe("buildCalendarLinks", () => {
  it("builds the feed URL from origin and token", () => {
    const links = buildCalendarLinks("https://afterclass.io", "abc123");
    expect(links.feedUrl).toBe("https://afterclass.io/api/ical/abc123");
  });

  it("swaps https for webcal in the subscribe URL", () => {
    const links = buildCalendarLinks("https://afterclass.io", "abc123");
    expect(links.subscribeUrl).toBe("webcal://afterclass.io/api/ical/abc123");
  });

  it("swaps http for webcal in local development", () => {
    const links = buildCalendarLinks("http://localhost:3000", "tok");
    expect(links.subscribeUrl).toBe("webcal://localhost:3000/api/ical/tok");
  });

  it("builds one-step subscribe URLs for Google, Apple and Outlook", () => {
    const links = buildCalendarLinks("https://afterclass.io", "tok123");
    expect(links.googleSubscribeUrl).toBe(
      "https://calendar.google.com/calendar/r?cid=" +
        encodeURIComponent("webcal://afterclass.io/api/ical/tok123"),
    );
    expect(links.appleSubscribeUrl).toBe(
      "webcal://afterclass.io/api/ical/tok123",
    );
    expect(links.outlookSubscribeUrl).toBe(
      "https://outlook.live.com/calendar/0/addfromweb?url=" +
        encodeURIComponent("https://afterclass.io/api/ical/tok123"),
    );
  });
});
