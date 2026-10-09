import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

const { mockCheckBudget, mockGetChatConfigAsync, mockFindUnique } = vi.hoisted(
  () => ({
    mockCheckBudget: vi.fn() as Mock,
    mockGetChatConfigAsync: vi.fn() as Mock,
    mockFindUnique: vi.fn() as Mock,
  }),
);

vi.mock("server-only", () => ({}));

vi.mock("@/server/assistant/budget", () => ({
  checkBudget: mockCheckBudget,
}));

vi.mock("@/server/config/chat-config", () => ({
  getChatConfigAsync: mockGetChatConfigAsync,
}));

vi.mock("@/server/db", () => ({
  db: {
    userTimetable: {
      findUnique: mockFindUnique,
    },
  },
}));

import { GET } from "./route";

describe("GET /api/ical/[token] (expiry)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-09T00:00:00Z"));

    mockCheckBudget.mockReset();
    mockGetChatConfigAsync.mockReset();
    mockFindUnique.mockReset();

    mockGetChatConfigAsync.mockResolvedValue({ icalThrottlePerMinute: 60 });
    mockCheckBudget.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 404 when the academic term has ended in the past", async () => {
    mockFindUnique.mockResolvedValue({
      id: "t1",
      name: "Past Term Plan",
      visibility: "UNLISTED",
      icalToken: "expired-token",
      acadTerm: {
        startDt: new Date("2026-01-10T00:00:00Z"),
        endDt: new Date("2026-05-01T00:00:00Z"),
      },
      slots: [],
    });

    const req = new NextRequest("http://localhost/api/ical/expired-token");
    const res = await GET(req, {
      params: Promise.resolve({ token: "expired-token" }),
    });

    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Not Found");
  });

  it("returns 200 with text/calendar when the academic term has not ended", async () => {
    mockFindUnique.mockResolvedValue({
      id: "t1",
      name: "Current Term Plan",
      visibility: "UNLISTED",
      icalToken: "active-token",
      acadTerm: {
        startDt: new Date("2026-08-10T00:00:00Z"),
        endDt: new Date("2026-12-01T00:00:00Z"),
      },
      slots: [],
    });

    const req = new NextRequest("http://localhost/api/ical/active-token");
    const res = await GET(req, {
      params: Promise.resolve({ token: "active-token" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/calendar");
    const text = await res.text();
    expect(text).toContain("BEGIN:VCALENDAR");
  });
});
