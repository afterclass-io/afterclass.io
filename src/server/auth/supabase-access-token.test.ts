import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { mockCookies, mockDecode } = vi.hoisted(() => ({
  mockCookies: vi.fn() as Mock,
  mockDecode: vi.fn() as Mock,
}));

// supabase-access-token.ts imports "server-only" which throws outside Next.
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: mockCookies }));
vi.mock("next-auth/jwt", () => ({ decode: mockDecode }));

import { getSupabaseAccessToken } from "./supabase-access-token";
import { authConfig } from "./config";

function cookieStore(entries: Record<string, string>) {
  return { get: (name: string) => (entries[name] ? { value: entries[name] } : undefined) };
}

describe("getSupabaseAccessToken", () => {
  beforeEach(() => {
    mockCookies.mockReset();
    mockDecode.mockReset();
  });

  it("returns null when no session cookie is present", async () => {
    mockCookies.mockResolvedValue(cookieStore({}));
    await expect(getSupabaseAccessToken()).resolves.toBeNull();
    expect(mockDecode).not.toHaveBeenCalled();
  });

  it("decodes the plain authjs cookie and returns the token from the JWT", async () => {
    mockCookies.mockResolvedValue(cookieStore({ "authjs.session-token": "raw-jwe" }));
    mockDecode.mockResolvedValue({ sub: "u1", supabaseAccessToken: "supa-tok" });
    await expect(getSupabaseAccessToken()).resolves.toBe("supa-tok");
    // The salt must be the cookie name - Auth.js derives the JWE key from it.
    expect(mockDecode).toHaveBeenCalledWith(
      expect.objectContaining({ token: "raw-jwe", salt: "authjs.session-token" }),
    );
  });

  it("prefers the __Secure- cookie and uses its name as the salt", async () => {
    mockCookies.mockResolvedValue(
      cookieStore({
        "__Secure-authjs.session-token": "raw-secure",
        "authjs.session-token": "raw-plain",
      }),
    );
    mockDecode.mockResolvedValue({ sub: "u1", supabaseAccessToken: "supa-tok" });
    await expect(getSupabaseAccessToken()).resolves.toBe("supa-tok");
    expect(mockDecode).toHaveBeenCalledWith(
      expect.objectContaining({ token: "raw-secure", salt: "__Secure-authjs.session-token" }),
    );
  });

  it("returns null when the JWT carries no supabaseAccessToken (e.g. Google sign-in)", async () => {
    mockCookies.mockResolvedValue(cookieStore({ "authjs.session-token": "raw-jwe" }));
    mockDecode.mockResolvedValue({ sub: "u1" });
    await expect(getSupabaseAccessToken()).resolves.toBeNull();
  });
});

describe("authConfig session/JWT token handling (regression)", () => {
  const user = { id: "u1", email: "a@smu.edu.sg" };

  it("jwt callback persists supabaseAccessToken in the JWT for credentials sign-in", async () => {
    const params = {
      token: { sub: "u1" },
      user: { ...user, supabaseAccessToken: "supa-tok" },
    } as unknown as Parameters<NonNullable<typeof authConfig.callbacks.jwt>>[0];
    const token = await authConfig.callbacks.jwt(params);
    expect(token?.supabaseAccessToken).toBe("supa-tok");
  });

  it("session callback does NOT expose supabaseAccessToken on the client session", () => {
    const params = {
      session: { user: { ...user }, expires: "2099-01-01" },
      token: { sub: "u1", user, supabaseAccessToken: "supa-tok" },
    } as unknown as Parameters<NonNullable<typeof authConfig.callbacks.session>>[0];
    const session = authConfig.callbacks.session(params);
    // The session object is served verbatim by /api/auth/session to browser JS.
    expect(session.user).not.toHaveProperty("supabaseAccessToken");
    expect(JSON.stringify(session)).not.toContain("supa-tok");
  });
});
