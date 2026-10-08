import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

const { mockCheckBudget, mockGetChatConfigAsync, mockGetFeedData } = vi.hoisted(
  () => ({
    mockCheckBudget: vi.fn() as Mock,
    mockGetChatConfigAsync: vi.fn() as Mock,
    mockGetFeedData: vi.fn() as Mock,
  }),
);

vi.mock("@/server/assistant/budget", () => ({
  checkBudget: mockCheckBudget,
}));

vi.mock("@/server/config/chat-config", () => ({
  getChatConfigAsync: mockGetChatConfigAsync,
}));

vi.mock("@/server/api/timetable/getFeedData", () => ({
  getFeedData: mockGetFeedData,
}));

import { GET } from "./route";

describe("GET /api/ical/[token]", () => {
  beforeEach(() => {
    mockCheckBudget.mockReset();
    mockGetChatConfigAsync.mockReset();
    mockGetFeedData.mockReset();

    mockGetChatConfigAsync.mockResolvedValue({ icalThrottlePerMinute: 60 });
    mockCheckBudget.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
    mockGetFeedData.mockResolvedValue(null);
  });

  it("keys the throttle on x-vercel-forwarded-for", async () => {
    const req = new NextRequest("http://localhost/api/ical/test-token", {
      headers: {
        "x-vercel-forwarded-for": "1.1.1.1",
        "x-forwarded-for": "2.2.2.2",
      },
    });

    await GET(req, { params: Promise.resolve({ token: "test-token" }) });

    expect(mockCheckBudget).toHaveBeenCalledWith(
      { user: { id: "1.1.1.1" } },
      { prefix: "ical", limit: 60, windowMs: 60_000, kind: "read" },
    );
  });

  it("falls back to x-forwarded-for first hop", async () => {
    const req = new NextRequest("http://localhost/api/ical/test-token", {
      headers: {
        "x-forwarded-for": "2.2.2.2, 3.3.3.3",
      },
    });

    await GET(req, { params: Promise.resolve({ token: "test-token" }) });

    expect(mockCheckBudget).toHaveBeenCalledWith(
      { user: { id: "2.2.2.2" } },
      { prefix: "ical", limit: 60, windowMs: 60_000, kind: "read" },
    );
  });

  it("uses unknown without headers", async () => {
    const req = new NextRequest("http://localhost/api/ical/test-token");

    await GET(req, { params: Promise.resolve({ token: "test-token" }) });

    expect(mockCheckBudget).toHaveBeenCalledWith(
      { user: { id: "unknown" } },
      { prefix: "ical", limit: 60, windowMs: 60_000, kind: "read" },
    );
  });

  it("returns 429 before the token lookup", async () => {
    mockCheckBudget.mockResolvedValue({ ok: false, retryAfterSeconds: 5 });

    const req = new NextRequest("http://localhost/api/ical/test-token");
    const res = await GET(req, {
      params: Promise.resolve({ token: "test-token" }),
    });

    expect(res.status).toBe(429);
    expect(await res.text()).toBe("Too many requests");
    expect(mockGetFeedData).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown token", async () => {
    mockCheckBudget.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
    mockGetFeedData.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/ical/test-token");
    const res = await GET(req, {
      params: Promise.resolve({ token: "test-token" }),
    });

    expect(res.status).toBe(404);
    expect(mockGetFeedData).toHaveBeenCalledWith("test-token");
  });
});
