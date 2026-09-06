import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const {
  mockGetToken,
  mockApproveConsent,
  mockDenyConsent,
  mockGetConsentDetails,
} = vi.hoisted(() => ({
  mockGetToken: vi.fn() as Mock,
  mockApproveConsent: vi.fn() as Mock,
  mockDenyConsent: vi.fn() as Mock,
  mockGetConsentDetails: vi.fn() as Mock,
}));

vi.mock("@/server/auth/supabase-access-token", () => ({
  getSupabaseAccessToken: mockGetToken,
}));
vi.mock("@/server/supabase-consent", () => ({
  approveConsent: mockApproveConsent,
  denyConsent: mockDenyConsent,
  getConsentDetails: mockGetConsentDetails,
}));

import { GET, POST } from "./route";

function req(
  url: string,
  init: RequestInit & { headers?: Record<string, string> } = {},
): Request {
  // Default same-origin headers for the consent page's own fetch.
  return new Request(url, {
    ...init,
    headers: { "sec-fetch-site": "same-origin", ...init.headers },
  });
}

describe("GET /api/oauth/consent", () => {
  beforeEach(() => {
    mockGetToken.mockReset();
    mockGetConsentDetails.mockReset();
    mockGetConsentDetails.mockResolvedValue({
      status: "details",
      client: { name: "Test App" },
      scope: "email",
      redirect_uri: "https://client/cb",
    });
  });

  it("returns 401 without a supabase access token", async () => {
    mockGetToken.mockResolvedValue(null);
    const res = await GET(
      req("http://localhost/api/oauth/consent?authorization_id=a1"),
    );
    expect(res.status).toBe(401);
  });

  it("returns consent details for a same-origin GET", async () => {
    mockGetToken.mockResolvedValue("tok");
    const res = await GET(
      req("http://localhost/api/oauth/consent?authorization_id=a1"),
    );
    expect(res.status).toBe(200);
    expect(mockGetConsentDetails).toHaveBeenCalledWith("a1", "tok");
  });

  it("rejects cross-origin GET via Sec-Fetch-Site (403)", async () => {
    mockGetToken.mockResolvedValue("tok");
    const res = await GET(
      req("http://localhost/api/oauth/consent?authorization_id=a1", {
        headers: { "sec-fetch-site": "cross-site" },
      }),
    );
    expect(res.status).toBe(403);
    expect(mockGetConsentDetails).not.toHaveBeenCalled();
  });

  it("rejects cross-origin GET via Origin header mismatch (403)", async () => {
    mockGetToken.mockResolvedValue("tok");
    const res = await GET(
      req("http://localhost/api/oauth/consent?authorization_id=a1", {
        headers: { origin: "https://evil.example.com" },
      }),
    );
    expect(res.status).toBe(403);
    expect(mockGetConsentDetails).not.toHaveBeenCalled();
  });

  it("maps provider failures to a generic error (no detail leak)", async () => {
    mockGetToken.mockResolvedValue("tok");
    mockGetConsentDetails.mockRejectedValueOnce(
      new Error("supabase internal: row xxx"),
    );
    const res = await GET(
      req("http://localhost/api/oauth/consent?authorization_id=a1"),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid authorization request");
    expect(body.error).not.toContain("supabase");
  });
});

describe("POST /api/oauth/consent", () => {
  beforeEach(() => {
    mockGetToken.mockReset();
    mockApproveConsent.mockReset();
    mockDenyConsent.mockReset();
    mockApproveConsent.mockResolvedValue({
      redirectUrl: "https://client/cb?code=x",
    });
    mockDenyConsent.mockResolvedValue({
      redirectUrl: "https://client/cb?error=access_denied",
    });
    mockGetToken.mockResolvedValue("tok");
  });

  it("returns 401 without a supabase access token", async () => {
    mockGetToken.mockResolvedValue(null);
    const res = await POST(
      req("http://localhost/api/oauth/consent", {
        method: "POST",
        body: JSON.stringify({ authorization_id: "a1", decision: "approve" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("approve passes through", async () => {
    const res = await POST(
      req("http://localhost/api/oauth/consent", {
        method: "POST",
        body: JSON.stringify({ authorization_id: "a1", decision: "approve" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(mockApproveConsent).toHaveBeenCalledWith("a1", "tok");
    const body = (await res.json()) as { redirectUrl: string };
    expect(body.redirectUrl).toBe("https://client/cb?code=x");
  });

  it("deny passes through", async () => {
    const res = await POST(
      req("http://localhost/api/oauth/consent", {
        method: "POST",
        body: JSON.stringify({ authorization_id: "a1", decision: "deny" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(mockDenyConsent).toHaveBeenCalledWith("a1", "tok");
  });

  it("returns 400 for unknown decision - does not take the deny path", async () => {
    const res = await POST(
      req("http://localhost/api/oauth/consent", {
        method: "POST",
        body: JSON.stringify({ authorization_id: "a1", decision: "foo" }),
      }),
    );
    expect(res.status).toBe(400);
    expect(mockApproveConsent).not.toHaveBeenCalled();
    expect(mockDenyConsent).not.toHaveBeenCalled();
  });

  it("rejects cross-origin POST via Sec-Fetch-Site (403)", async () => {
    const res = await POST(
      req("http://localhost/api/oauth/consent", {
        method: "POST",
        headers: { "sec-fetch-site": "cross-site" },
        body: JSON.stringify({ authorization_id: "a1", decision: "approve" }),
      }),
    );
    expect(res.status).toBe(403);
    expect(mockApproveConsent).not.toHaveBeenCalled();
  });

  it("rejects cross-origin POST via Origin header mismatch (403)", async () => {
    const res = await POST(
      req("http://localhost/api/oauth/consent", {
        method: "POST",
        headers: { origin: "https://evil.example.com" },
        body: JSON.stringify({ authorization_id: "a1", decision: "approve" }),
      }),
    );
    expect(res.status).toBe(403);
    expect(mockApproveConsent).not.toHaveBeenCalled();
  });

  it("maps provider failures to a generic error (no detail leak)", async () => {
    mockApproveConsent.mockRejectedValueOnce(
      new Error("supabase internal: row xxx"),
    );
    const res = await POST(
      req("http://localhost/api/oauth/consent", {
        method: "POST",
        body: JSON.stringify({ authorization_id: "a1", decision: "approve" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("failed");
    expect(body.error).not.toContain("supabase");
  });
});
