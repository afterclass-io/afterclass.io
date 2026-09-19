import { describe, expect, it, vi } from "vitest";

import { exchangeGoogleIdToken } from "./supabase-link";

const base = { supabaseUrl: "https://xyz.supabase.co", anonKey: "anon-key" };

describe("exchangeGoogleIdToken", () => {
  it("returns tokens + supabase user id", async () => {
    const fakeAuth = {
      signInWithIdToken: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: "supa-access",
            refresh_token: "supa-refresh",
            expires_at: 9999999999,
          },
          user: { id: "supa-uid" },
        },
        error: null,
      }),
    };
    const out = await exchangeGoogleIdToken(
      { idToken: "google-id-token", ...base },
      fakeAuth,
    );
    expect(fakeAuth.signInWithIdToken).toHaveBeenCalledWith({
      provider: "google",
      token: "google-id-token",
    });
    expect(out).toEqual({
      accessToken: "supa-access",
      refreshToken: "supa-refresh",
      expiresAt: 9999999999,
      supabaseUserId: "supa-uid",
    });
  });

  it("throws on provider error", async () => {
    const fakeAuth = {
      signInWithIdToken: vi.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: { message: "bad token" },
      }),
    };
    await expect(
      exchangeGoogleIdToken({ idToken: "bad", ...base }, fakeAuth),
    ).rejects.toThrow("bad token");
  });
});
