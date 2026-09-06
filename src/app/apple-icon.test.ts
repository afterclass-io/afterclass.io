import { describe, expect, it } from "vitest";

import AppleIcon, { size, contentType, runtime } from "./apple-icon";

describe("apple-icon", () => {
  it("exports size 180x180", () => {
    expect(size).toEqual({
      width: 180,
      height: 180,
    });
  });

  it("exports content-type image/png", () => {
    expect(contentType).toBe("image/png");
  });

  it("exports nodejs runtime", () => {
    expect(runtime).toBe("nodejs");
  });

  it("generates ImageResponse with 200 status and image/png content-type", () => {
    const response = AppleIcon();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
  });
});
