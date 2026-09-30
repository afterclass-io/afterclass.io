import { describe, expect, it } from "vitest";
import {
  ENGAGEMENT_MESSAGES,
  markShown,
  pickEngagementMessage,
  shouldShowWelcome,
  WELCOME_INTERVAL_DAYS,
  WELCOME_MAX_SHOWS,
  type WelcomePrefs,
} from "./logic";

const DAY = 86_400_000;
const now = Date.parse("2026-08-04T12:00:00Z");
const empty: WelcomePrefs = { lastShownAt: null, shownCount: 0 };

describe("shouldShowWelcome", () => {
  it("shows when never shown", () => {
    expect(shouldShowWelcome(empty, now)).toBe(true);
  });
  it("hides within the interval", () => {
    expect(
      shouldShowWelcome(
        { lastShownAt: new Date(now - DAY).toISOString(), shownCount: 1 },
        now,
      ),
    ).toBe(false);
  });
  it("shows again after the interval", () => {
    const last = new Date(now - WELCOME_INTERVAL_DAYS * DAY).toISOString();
    expect(shouldShowWelcome({ lastShownAt: last, shownCount: 1 }, now)).toBe(
      true,
    );
  });
  it("stops after the max number of shows", () => {
    expect(
      shouldShowWelcome(
        {
          lastShownAt: new Date(
            now - WELCOME_INTERVAL_DAYS * DAY,
          ).toISOString(),
          shownCount: WELCOME_MAX_SHOWS,
        },
        now,
      ),
    ).toBe(false);
  });
});

describe("markShown", () => {
  it("increments count and stamps now", () => {
    const next = markShown(empty);
    expect(next.shownCount).toBe(1);
    expect(next.lastShownAt).not.toBeNull();
  });
});

describe("pickEngagementMessage", () => {
  it("returns a neutral engagement message when connected and quota is healthy", () => {
    const msg = pickEngagementMessage(true, 50, 50);
    expect(ENGAGEMENT_MESSAGES).toContain(msg);
  });
  it("returns the switch-to copy when connected and remaining is critical", () => {
    expect(pickEngagementMessage(true, 3, 50)).toContain(
      "switch to your connected agent for unlimited",
    );
  });
  it("returns a quota push when remaining is low", () => {
    expect(pickEngagementMessage(false, 3, 50)).toContain("connect your agent");
  });
  it("returns a message from the pool otherwise", () => {
    const msg = pickEngagementMessage(false, 50, 50);
    expect(ENGAGEMENT_MESSAGES).toContain(msg);
  });
});
