import { describe, expect, it } from "vitest";
import randomId from "./randomId";

describe("randomId", () => {
  it("returns a 12-char id from the non-ambiguous alphabet", () => {
    expect(randomId()).toMatch(/^[cdefhjkmnprtvwxy2345689]{12}$/);
  });

  it("is practically unique across many calls", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => randomId()));
    expect(ids.size).toBe(1000);
  });
});
