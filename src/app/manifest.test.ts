import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("manifest()", () => {
  it("returns web manifest with required PWA metadata", () => {
    const result = manifest();

    expect(result).toEqual({
      name: "AfterClass",
      short_name: "AfterClass",
      description:
        "Read 12,000+ reviews of courses and professors. Buy/sell course material. Personalized internship matching. Break classroom barriers. - Our one-stop-shop connection community.",
      start_url: "/",
      display: "standalone",
      background_color: "#F1F1F3",
      theme_color: "#F1F1F3",
      icons: [
        {
          src: "/favicon.ico",
          sizes: "any",
          type: "image/x-icon",
        },
        {
          src: "/icon",
          sizes: "32x32",
          type: "image/png",
        },
        {
          src: "/apple-icon",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    });
  });

  it("declares non-empty icon array with valid icon objects", () => {
    const result = manifest();

    expect(Array.isArray(result.icons)).toBe(true);
    expect(result.icons?.length).toBeGreaterThanOrEqual(1);

    result.icons?.forEach((icon) => {
      expect(icon.src).toBeDefined();
      expect(icon.src.startsWith("/")).toBe(true);
      expect(icon.sizes).toBeDefined();
      expect(icon.type).toBeDefined();
    });
  });
});
