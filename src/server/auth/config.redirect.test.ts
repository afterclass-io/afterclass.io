import { describe, expect, it, vi } from "vitest";

vi.mock("@/common/providers/EdgeConfig/EdgeConfigProvider", () => ({
  getEdgeConfig: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: {
    users: { findUnique: vi.fn() },
    universities: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("@/server/supabase", () => ({
  signInWithEmail: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: vi.fn(),
}));

import { authConfig } from "./config";

describe("authConfig redirect callback", () => {
  const baseUrl = "https://afterclass.io";

  it("resolves relative path /submit to baseUrl/submit", () => {
    expect(authConfig.callbacks.redirect({ url: "/submit", baseUrl })).toBe(
      `${baseUrl}/submit`,
    );
  });

  it("preserves same-origin url", () => {
    expect(
      authConfig.callbacks.redirect({ url: `${baseUrl}/submit`, baseUrl }),
    ).toBe(`${baseUrl}/submit`);
  });

  it("rejects cross-origin url", () => {
    expect(
      authConfig.callbacks.redirect({
        url: "https://evil.example/x",
        baseUrl,
      }),
    ).toBe(baseUrl);
  });

  it("rejects protocol-relative url //evil.example", () => {
    expect(
      authConfig.callbacks.redirect({ url: "//evil.example", baseUrl }),
    ).toBe(baseUrl);
  });

  it("rejects backslash-relative url /\\evil.example", () => {
    expect(
      authConfig.callbacks.redirect({ url: "/\\evil.example", baseUrl }),
    ).toBe(baseUrl);
  });

  it("rejects javascript: url", () => {
    expect(
      authConfig.callbacks.redirect({
        url: "javascript:alert(1)",
        baseUrl,
      }),
    ).toBe(baseUrl);
  });

  it("rejects malformed non-url string", () => {
    expect(authConfig.callbacks.redirect({ url: "not a url", baseUrl })).toBe(
      baseUrl,
    );
  });
});
