import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { mockCookies, mockDecode, mockGetAuthSecret } = vi.hoisted(() => ({
  mockCookies: vi.fn() as Mock,
  mockDecode: vi.fn() as Mock,
  mockGetAuthSecret: vi.fn() as Mock,
}));

// supabase-access-token.ts imports "server-only" which throws outside Next.
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: mockCookies }));
vi.mock("next-auth/jwt", () => ({ decode: mockDecode }));
vi.mock("./auth-secret", () => ({ getAuthSecret: mockGetAuthSecret }));

import {
  getSupabaseAccessToken,
  getSupabaseRefreshToken,
} from "./supabase-access-token";

const SECURE_COOKIE = "__Secure-authjs.session-token";
const PLAIN_COOKIE = "authjs.session-token";

function cookieStore(entries: Record<string, string>) {
  return {
    get: (name: string) =>
      entries[name] ? { value: entries[name] } : undefined,
  };
}

const decodedToken = {
  sub: "u1",
  supabaseAccessToken: "supa-tok",
  supabaseRefreshToken: "supa-refresh",
};

const accessors = [
  {
    name: "getSupabaseAccessToken",
    read: getSupabaseAccessToken,
    expected: "supa-tok",
  },
  {
    name: "getSupabaseRefreshToken",
    read: getSupabaseRefreshToken,
    expected: "supa-refresh",
  },
];

describe.each(accessors)("$name cookie handling", ({ read, expected }) => {
  beforeEach(() => {
    mockCookies.mockReset();
    mockDecode.mockReset();
    mockGetAuthSecret.mockReset();
    mockGetAuthSecret.mockReturnValue("test-secret");
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("decodes the __Secure- cookie with its name as the salt in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mockCookies.mockResolvedValue(
      cookieStore({ [SECURE_COOKIE]: "raw-secure" }),
    );
    mockDecode.mockResolvedValue(decodedToken);
    await expect(read()).resolves.toBe(expected);
    expect(mockDecode).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "raw-secure",
        salt: SECURE_COOKIE,
      }),
    );
  });

  it("refuses a plain cookie in production without decoding it", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mockCookies.mockResolvedValue(cookieStore({ [PLAIN_COOKIE]: "raw-plain" }));
    mockDecode.mockResolvedValue(decodedToken);
    await expect(read()).resolves.toBeNull();
    expect(mockDecode).not.toHaveBeenCalled();
  });

  it("decodes a plain cookie with its name as the salt in test", async () => {
    mockCookies.mockResolvedValue(cookieStore({ [PLAIN_COOKIE]: "raw-plain" }));
    mockDecode.mockResolvedValue(decodedToken);
    await expect(read()).resolves.toBe(expected);
    expect(mockDecode).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "raw-plain",
        salt: PLAIN_COOKIE,
      }),
    );
  });

  it("decodes a plain cookie with its name as the salt in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mockCookies.mockResolvedValue(cookieStore({ [PLAIN_COOKIE]: "raw-plain" }));
    mockDecode.mockResolvedValue(decodedToken);
    await expect(read()).resolves.toBe(expected);
    expect(mockDecode).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "raw-plain",
        salt: PLAIN_COOKIE,
      }),
    );
  });

  it("returns null when no secret is configured, without decoding", async () => {
    mockCookies.mockResolvedValue(cookieStore({ [PLAIN_COOKIE]: "raw-plain" }));
    mockGetAuthSecret.mockReturnValue(undefined);
    await expect(read()).resolves.toBeNull();
    expect(mockDecode).not.toHaveBeenCalled();
  });

  it("returns null instead of throwing when decode fails", async () => {
    mockCookies.mockResolvedValue(cookieStore({ [PLAIN_COOKIE]: "tampered" }));
    mockDecode.mockRejectedValue(new Error("JWEDecryptionFailed"));
    await expect(read()).resolves.toBeNull();
  });
});
