import { describe, expect, it } from "vitest";

import { buttonVariants } from "./button";

describe("buttonVariants", () => {
  it("includes h-auto and min-h-6 without default h-9 or px-4 when size is inline", () => {
    const classes = buttonVariants({ variant: "link", size: "inline" });

    expect(classes).toContain("h-auto");
    expect(classes).toContain("min-h-6");
    expect(classes).not.toContain("h-9");
    expect(classes).not.toContain("px-4");
  });

  it("still includes default h-9 when size is omitted", () => {
    const classes = buttonVariants({ variant: "link" });

    expect(classes).toContain("h-9");
  });
});
