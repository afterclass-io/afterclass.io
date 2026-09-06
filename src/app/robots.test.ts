import { describe, expect, it, vi, beforeEach } from "vitest";

import robots from "./robots";

let mockVercelEnv: "development" | "preview" | "production" | undefined =
  undefined;
let mockSiteUrl = "https://afterclass.io";

vi.mock("@/env", () => ({
  get env() {
    return {
      get NEXT_PUBLIC_SITE_URL() {
        return mockSiteUrl;
      },
      get VERCEL_ENV() {
        return mockVercelEnv;
      },
    };
  },
}));

describe("robots()", () => {
  beforeEach(() => {
    mockSiteUrl = "https://afterclass.io";
    mockVercelEnv = undefined;
  });

  it("disallows everything and points to sitemap when in non-production (undefined)", () => {
    mockVercelEnv = undefined;

    const result = robots();

    expect(result).toEqual({
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      sitemap: "https://afterclass.io/sitemap.xml",
    });
  });

  it("disallows everything and points to sitemap when in preview", () => {
    mockVercelEnv = "preview";

    const result = robots();

    expect(result).toEqual({
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      sitemap: "https://afterclass.io/sitemap.xml",
    });
  });

  it("disallows everything and points to sitemap when in development", () => {
    mockVercelEnv = "development";

    const result = robots();

    expect(result).toEqual({
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      sitemap: "https://afterclass.io/sitemap.xml",
    });
  });

  it("allows crawling but disallows api, auth, submit, and search in production", () => {
    mockVercelEnv = "production";

    const result = robots();

    expect(result).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/account/auth/", "/submit", "/search"],
      },
      sitemap: "https://afterclass.io/sitemap.xml",
    });
  });

  it("normalizes trailing slashes on baseUrl", () => {
    mockSiteUrl = "https://afterclass.io/";
    mockVercelEnv = "production";

    const result = robots();

    expect(result.sitemap).toBe("https://afterclass.io/sitemap.xml");
  });
});
