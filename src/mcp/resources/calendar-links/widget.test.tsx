// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import CalendarLinksWidget, { widgetMetadata } from "./widget";

function setMcpParams(toolOutput: unknown, toolInput: unknown = {}) {
  window.history.replaceState(
    null,
    "",
    `/?mcpUseParams=${encodeURIComponent(
      JSON.stringify({ toolInput, toolOutput, toolId: "calendar-links" }),
    )}`,
  );
}

function renderCalendarLinks(toolOutput: unknown) {
  setMcpParams(toolOutput);
  return render(<CalendarLinksWidget />);
}

const fullProps = {
  feedUrl: "https://afterclass.io/api/ical/tok123",
  subscribeUrl: "webcal://afterclass.io/api/ical/tok123",
  googleSubscribeUrl:
    "https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2Fafterclass.io%2Fapi%2Fical%2Ftok123",
  appleSubscribeUrl: "webcal://afterclass.io/api/ical/tok123",
  outlookSubscribeUrl:
    "https://outlook.live.com/calendar/0/addfromweb?url=https%3A%2F%2Fafterclass.io%2Fapi%2Fical%2Ftok123",
  madeLinkShareable: false,
};

describe("calendar-links widgetMetadata", () => {
  const propsSchema = widgetMetadata.props! as z.ZodTypeAny;

  it("parses fullProps", () => {
    expect(propsSchema.safeParse(fullProps).success).toBe(true);
  });
});

describe("calendar-links widget render", () => {
  it("shows loading state while pending", () => {
    renderCalendarLinks(null);
    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("renders three subscribe buttons whose hrefs match the props", () => {
    renderCalendarLinks(fullProps);
    expect(
      screen.getByRole("link", { name: /Google Calendar/i }).getAttribute("href"),
    ).toBe(fullProps.googleSubscribeUrl);
    expect(
      screen.getByRole("link", { name: /Apple Calendar/i }).getAttribute("href"),
    ).toBe(fullProps.appleSubscribeUrl);
    expect(
      screen.getByRole("link", { name: /Outlook/i }).getAttribute("href"),
    ).toBe(fullProps.outlookSubscribeUrl);
  });

  it("renders the feed URL in a copyable read-only input", () => {
    renderCalendarLinks(fullProps);
    expect(screen.getByDisplayValue(fullProps.feedUrl)).toBeTruthy();
  });

  it("when madeLinkShareable=true, shows the link-sharing note", () => {
    renderCalendarLinks({ ...fullProps, madeLinkShareable: true });
    expect(screen.getByText(/link-sharing was turned on/i)).toBeTruthy();
  });
});
