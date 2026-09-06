import { describe, expect, it } from "vitest";

import Icon, { size, contentType, runtime, dynamic } from "./icon";

describe("icon", () => {
  it("exports dynamic force-static", () => {
    expect(dynamic).toBe("force-static");
  });

  it("exports size 32x32", () => {
    expect(size).toEqual({
      width: 32,
      height: 32,
    });
  });

  it("exports content-type image/png", () => {
    expect(contentType).toBe("image/png");
  });

  it("exports nodejs runtime", () => {
    expect(runtime).toBe("nodejs");
  });

  it("generates ImageResponse with 200 status and image/png content-type", () => {
    const response = Icon();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
  });
});
