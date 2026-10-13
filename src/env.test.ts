import { afterEach, describe, expect, it, vi } from "vitest";

function resetBaseEnvs() {
  vi.stubEnv("SKIP_ENV_VALIDATION", undefined);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
  vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", undefined);
  vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", undefined);
  vi.stubEnv("NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL", undefined);
  vi.stubEnv("VERCEL_ENV", undefined);
  vi.stubEnv("ENABLE_PASSWORD_LOGIN", undefined);
}

describe("src/env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prioritizes explicit NEXT_PUBLIC_SITE_URL over Vercel variables", async () => {
    vi.resetModules();
    resetBaseEnvs();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "x.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL", "afterclass.io");

    const { env } = await import("@/env");
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://example.test");
  });

  it("prepends https:// when NEXT_PUBLIC_SITE_URL has no scheme", async () => {
    vi.resetModules();
    resetBaseEnvs();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "example.test");

    const { env } = await import("@/env");
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://example.test");
  });

  it("resolves production URL when NEXT_PUBLIC_VERCEL_ENV is production", async () => {
    vi.resetModules();
    resetBaseEnvs();
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL", "afterclass.io");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "x.vercel.app");

    const { env } = await import("@/env");
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://afterclass.io");
  });

  it("resolves deployment URL when NEXT_PUBLIC_VERCEL_ENV is production with only deployment URL set", async () => {
    vi.resetModules();
    resetBaseEnvs();
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "x.vercel.app");

    const { env } = await import("@/env");
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://x.vercel.app");
  });

  it("resolves deployment URL when NEXT_PUBLIC_VERCEL_ENV is development with both URLs set", async () => {
    vi.resetModules();
    resetBaseEnvs();
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL", "afterclass.io");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "x.vercel.app");

    const { env } = await import("@/env");
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://x.vercel.app");
  });

  it("defaults to http://localhost:3000 when no URL variables are set", async () => {
    vi.resetModules();
    resetBaseEnvs();

    const { env } = await import("@/env");
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
  });

  it("throws when VERCEL_ENV is production and nothing else is set", async () => {
    vi.resetModules();
    resetBaseEnvs();
    vi.stubEnv("VERCEL_ENV", "production");

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    await expect(import("@/env")).rejects.toThrow();
    consoleSpy.mockRestore();
  });

  it("throws when VERCEL_ENV is preview and nothing else is set", async () => {
    vi.resetModules();
    resetBaseEnvs();
    vi.stubEnv("VERCEL_ENV", "preview");

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    await expect(import("@/env")).rejects.toThrow();
    consoleSpy.mockRestore();
  });

  it("does not define NEXTAUTH_URL on env", async () => {
    vi.resetModules();
    resetBaseEnvs();

    const { env } = await import("@/env");
    expect((env as Record<string, unknown>).NEXTAUTH_URL).toBeUndefined();
  });

  it("throws when ENABLE_PASSWORD_LOGIN is an invalid value", async () => {
    vi.resetModules();
    resetBaseEnvs();
    vi.stubEnv("ENABLE_PASSWORD_LOGIN", "yes");

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    await expect(import("@/env")).rejects.toThrow();
    consoleSpy.mockRestore();
  });

  it("succeeds when ENABLE_PASSWORD_LOGIN is set to 'true', 'false', or unset", async () => {
    for (const val of ["true", "false", undefined]) {
      vi.resetModules();
      resetBaseEnvs();
      vi.stubEnv("ENABLE_PASSWORD_LOGIN", val);

      const { env } = await import("@/env");
      expect(env.ENABLE_PASSWORD_LOGIN).toBe(val);
    }
  });
});
