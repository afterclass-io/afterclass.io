// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the whole mcp-use/react surface the View consumes (v2 contract) —
// unlike the v1 widget tests, nothing seeds window.openai or mcpUseParams.
vi.mock("mcp-use/react", () => ({
  useToolContext: vi.fn(),
  useViewTheme: vi.fn(),
}));

import CalendarLinksView, { viewConfig } from "./view";
import { useToolContext, useViewTheme } from "mcp-use/react";

const mockedUseToolContext = vi.mocked(useToolContext);
const mockedUseViewTheme = vi.mocked(useViewTheme);

// URLs live in the View-only `_meta` channel; structuredContent (toolOutput)
// only carries {timetableId, madeLinkShareable?}.
const fullMeta = {
  feedUrl: "https://afterclass.io/api/ical/tok123",
  subscribeUrl: "webcal://afterclass.io/api/ical/tok123",
  googleSubscribeUrl:
    "https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2Fafterclass.io%2Fapi%2Fical%2Ftok123",
  appleSubscribeUrl: "webcal://afterclass.io/api/ical/tok123",
  outlookSubscribeUrl:
    "https://outlook.live.com/calendar/0/addfromweb?url=https%3A%2F%2Fafterclass.io%2Fapi%2Fical%2Ftok123",
};

const toolOutput = { timetableId: "tt1", madeLinkShareable: false };

function seedContext(
  handle: Partial<{
    status: "pending" | "ready" | "error";
    toolInput: unknown;
    toolOutput: unknown;
    meta: unknown;
    error: { message: string };
  }>,
) {
  mockedUseToolContext.mockReturnValue(handle as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseViewTheme.mockReturnValue("light");
});

describe("CalendarLinksView (v2)", () => {
  it("exports a viewConfig with autoResize and all display modes", () => {
    expect(viewConfig).toEqual({
      autoResize: true,
      displayModes: ["inline", "fullscreen", "pip"],
    });
  });

  it("shows the skeleton while pending (no toolOutput yet)", () => {
    seedContext({ status: "pending", toolInput: {} });
    const { container } = render(<CalendarLinksView />);
    expect(container.querySelector("[aria-label='Loading']")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders three subscribe buttons whose hrefs come from meta (NOT toolOutput)", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput, meta: fullMeta });
    render(<CalendarLinksView />);
    expect(
      screen.getByRole("link", { name: /Google Calendar/i }).getAttribute("href"),
    ).toBe(fullMeta.googleSubscribeUrl);
    expect(
      screen.getByRole("link", { name: /Apple Calendar/i }).getAttribute("href"),
    ).toBe(fullMeta.appleSubscribeUrl);
    expect(
      screen.getByRole("link", { name: /Outlook/i }).getAttribute("href"),
    ).toBe(fullMeta.outlookSubscribeUrl);
  });

  it("renders the feed URL (from meta) in a copyable read-only input", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput, meta: fullMeta });
    render(<CalendarLinksView />);
    expect(screen.getByDisplayValue(fullMeta.feedUrl)).toBeInTheDocument();
  });

  it("shows an unavailable note (not empty CTAs) when meta is absent", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput });
    render(<CalendarLinksView />);
    expect(
      screen.getByText(/calendar links are unavailable/i),
    ).toBeInTheDocument();
    // No dead href="" links without meta.
    const hrefs = screen
      .queryAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs.every((h) => h !== "")).toBe(true);
  });

  it("never reads URLs from toolOutput (secret isolation)", () => {
    // Poison toolOutput with URL-shaped fields: the View must ignore them.
    seedContext({
      status: "ready",
      toolInput: {},
      toolOutput: {
        ...toolOutput,
        feedUrl: "https://LEAKED.example/feed",
        googleSubscribeUrl: "https://LEAKED.example/google",
      },
      meta: fullMeta,
    });
    render(<CalendarLinksView />);
    expect(screen.getByDisplayValue(fullMeta.feedUrl)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Google Calendar/i }).getAttribute("href"),
    ).toBe(fullMeta.googleSubscribeUrl);
    expect(screen.queryByDisplayValue(/LEAKED/)).toBeNull();
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs.some((h) => h?.includes("LEAKED"))).toBe(false);
  });

  it("when madeLinkShareable=true (toolOutput), shows the link-sharing note", () => {
    seedContext({
      status: "ready",
      toolInput: {},
      toolOutput: { ...toolOutput, madeLinkShareable: true },
      meta: fullMeta,
    });
    render(<CalendarLinksView />);
    expect(screen.getByText(/link-sharing was turned on/i)).toBeInTheDocument();
  });

  it("all three subscribe links render with correct target and rel", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput, meta: fullMeta });
    render(<CalendarLinksView />);
    const google = screen.getByRole("link", { name: /Google Calendar/i });
    const apple = screen.getByRole("link", { name: /Apple Calendar/i });
    const outlook = screen.getByRole("link", { name: /Outlook/i });
    for (const a of [google, apple, outlook]) {
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toBe("noreferrer");
    }
  });

  it("renders an error alert when the tool fails", () => {
    seedContext({ status: "error", toolInput: {}, error: { message: "boom" } });
    render(<CalendarLinksView />);
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
  });
});

describe("CalendarLinksView copy action", () => {
  it("Copy button writes feedUrl (from meta) to clipboard and shows Copied", async () => {
    let written: string | null = null;
    const origClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: (t: string) => {
          written = t;
          return Promise.resolve();
        },
      },
      configurable: true,
    });
    try {
      seedContext({ status: "ready", toolInput: {}, toolOutput, meta: fullMeta });
      render(<CalendarLinksView />);
      const btn = screen.getByRole("button", { name: /Copy/i });
      expect(btn.textContent).toBe("Copy");
      fireEvent.click(btn);
      await screen.findByRole("button", { name: /Copied/i });
      expect(written).toBe(fullMeta.feedUrl);
    } finally {
      Object.defineProperty(navigator, "clipboard", {
        value: origClipboard,
        configurable: true,
      });
    }
  });
});
