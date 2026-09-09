import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { mockAuth, mockGetAiConsentDate, mockSetAiConsentNow } = vi.hoisted(
  () => ({
    mockAuth: vi.fn() as Mock,
    mockGetAiConsentDate: vi.fn() as Mock,
    mockSetAiConsentNow: vi.fn() as Mock,
  }),
);

vi.mock("@/server/auth", () => ({ auth: mockAuth }));
vi.mock("@/server/assistant/consent", () => ({
  getAiConsentDate: mockGetAiConsentDate,
  setAiConsentNow: mockSetAiConsentNow,
}));

import { GET, POST } from "./route";

function postReq(body: unknown) {
  return new Request("http://localhost/api/assistant/consent", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("GET /api/assistant/consent", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockGetAiConsentDate.mockReset();
    mockSetAiConsentNow.mockReset();
  });

  it("returns 401 when unsigned", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockGetAiConsentDate).not.toHaveBeenCalled();
  });

  it("returns consented:false + null when never consented", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetAiConsentDate.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ consented: false, consentedAt: null });
  });

  it("returns consented:true + ISO date when consented", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetAiConsentDate.mockResolvedValue(
      new Date("2026-09-09T00:00:00.000Z"),
    );
    const res = await GET();
    expect(await res.json()).toEqual({
      consented: true,
      consentedAt: "2026-09-09T00:00:00.000Z",
    });
  });
});

describe("POST /api/assistant/consent", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockGetAiConsentDate.mockReset();
    mockSetAiConsentNow.mockReset();
  });

  it("returns 401 when unsigned", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(postReq({ agree: true }));
    expect(res.status).toBe(401);
    expect(mockSetAiConsentNow).not.toHaveBeenCalled();
  });

  it("returns 400 when agree is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
    expect(mockSetAiConsentNow).not.toHaveBeenCalled();
  });

  it("returns 400 when agree is not true", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(postReq({ agree: false }));
    expect(res.status).toBe(400);
    expect(mockSetAiConsentNow).not.toHaveBeenCalled();
  });

  it("stamps consent and returns consented:true on {agree:true}", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockSetAiConsentNow.mockResolvedValue(
      new Date("2026-09-09T00:00:00.000Z"),
    );
    const res = await POST(postReq({ agree: true }));
    expect(res.status).toBe(200);
    expect(mockSetAiConsentNow).toHaveBeenCalledWith("u1");
    expect(await res.json()).toEqual({
      consented: true,
      consentedAt: "2026-09-09T00:00:00.000Z",
    });
  });
});
