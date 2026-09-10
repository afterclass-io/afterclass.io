import { describe, expect, it } from "vitest";
import { bubbleStyle } from "./positioning";

describe("bubbleStyle", () => {
  it("aligns right edges with a 12px gap above a default launcher", () => {
    // 1024x768 viewport, launcher at default (952, 696)
    expect(
      bubbleStyle({ x: 952, y: 696 }, { width: 1024, height: 768 }),
    ).toEqual({ right: 16, bottom: 84 });
  });
  it("pins left and shrinks when the launcher hugs the left edge", () => {
    const style = bubbleStyle({ x: 8, y: 696 }, { width: 1024, height: 768 });
    expect(style.left).toBe(8);
    expect(style.maxWidth).toBe(1024 - 8 - 8);
    expect(style.right).toBeUndefined();
  });
  it("drops below the launcher when there is no room above", () => {
    const style = bubbleStyle({ x: 952, y: 8 }, { width: 1024, height: 768 });
    expect(style.top).toBe(8 + 56 + 12);
    expect(style.bottom).toBeUndefined();
  });
});
