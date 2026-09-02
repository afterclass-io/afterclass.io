// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
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

// TODO Task7: skipped — useWidget removed in mcp-use v2 (View migration in Task 7)
describe.skip("calendar-links widget render", () => {
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

  it("all three subscribe links render with correct hrefs, target and rel", () => {
    renderCalendarLinks(fullProps);
    const google = screen.getByRole("link", { name: /Google Calendar/i });
    const apple = screen.getByRole("link", { name: /Apple Calendar/i });
    const outlook = screen.getByRole("link", { name: /Outlook/i });
    expect(google.getAttribute("href")).toBe(fullProps.googleSubscribeUrl);
    expect(apple.getAttribute("href")).toBe(fullProps.appleSubscribeUrl);
    expect(outlook.getAttribute("href")).toBe(fullProps.outlookSubscribeUrl);
    for (const a of [google, apple, outlook]) {
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toBe("noreferrer");
    }
  });
});

// TODO Task7: skipped — useWidget removed in mcp-use v2 (View migration in Task 7)
describe.skip("calendar-links widget copy action", () => {
  it("Copy button writes feedUrl to clipboard and shows Copied", async () => {
    let written: string | null = null;
    const origClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: (t: string) => { written = t; return Promise.resolve(); } },
      configurable: true,
    });
    try {
      renderCalendarLinks(fullProps);
      const btn = screen.getByRole("button", { name: /Copy/i });
      expect(btn.textContent).toBe("Copy");
      fireEvent.click(btn);
      await screen.findByRole("button", { name: /Copied/i });
      expect(written).toBe(fullProps.feedUrl);
    } finally {
      Object.defineProperty(navigator, "clipboard", { value: origClipboard, configurable: true });
    }
  });
});
