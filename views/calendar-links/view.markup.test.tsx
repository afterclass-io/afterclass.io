// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Characterization (markup) tests: pin the rendered card shell of the ready
// state (with all links, and with the unavailable note) so the shared card
// chrome can change without changing the output.
vi.mock("mcp-use/react", () => ({
  useToolContext: vi.fn(),
  useViewTheme: vi.fn(),
}));

import CalendarLinksView from "./view";
import { useToolContext, useViewTheme } from "mcp-use/react";

const mockedUseToolContext = vi.mocked(useToolContext);
const mockedUseViewTheme = vi.mocked(useViewTheme);

const fullMeta = {
  feedUrl: "https://afterclass.io/api/ical/tok123.ics",
  subscribeUrl: "webcal://afterclass.io/api/ical/tok123.ics",
  googleSubscribeUrl:
    "https://calendar.google.com/calendar/r?cid=https%3A%2F%2Fafterclass.io%2Fapi%2Fical%2Ftok123.ics",
  appleSubscribeUrl: "webcal://afterclass.io/api/ical/tok123.ics",
  outlookSubscribeUrl:
    "https://outlook.live.com/calendar/0/addfromweb?url=https%3A%2F%2Fafterclass.io%2Fapi%2Fical%2Ftok123.ics",
};

const toolOutput = { timetableId: "tt1", madeLinkShareable: false };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CalendarLinksView markup", () => {
  it.each(["light", "dark"] as const)(
    "ready state with meta keeps the card markup (%s)",
    (theme) => {
      mockedUseViewTheme.mockReturnValue(theme);
      mockedUseToolContext.mockReturnValue({
        status: "ready",
        toolOutput,
        meta: fullMeta,
      } as never);
      const { container } = render(<CalendarLinksView />);
      expect(container.innerHTML).toMatchSnapshot();
    },
  );

  it("ready state without meta keeps the card markup", () => {
    mockedUseViewTheme.mockReturnValue("light");
    mockedUseToolContext.mockReturnValue({
      status: "ready",
      toolOutput,
      meta: undefined,
    } as never);
    const { container } = render(<CalendarLinksView />);
    expect(container.innerHTML).toMatchSnapshot();
  });
});
