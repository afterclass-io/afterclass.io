import { describe, expect, it } from "vitest";

import { listPublicInput } from "./input";

describe("listPublicInput", () => {
  it("applies the default limit", () => {
    const parsed = listPublicInput.parse({});
    expect(parsed.limit).toBe(20);
    expect(parsed.facultyId).toBeUndefined();
    expect(parsed.query).toBeUndefined();
    expect(parsed.sort).toBe("newest");
  });

  it("accepts composable filters", () => {
    const parsed = listPublicInput.parse({
      limit: 10,
      facultyId: 3,
      query: "analytics",
      cursor: "abc",
      sort: "most-viewed",
    });
    expect(parsed).toEqual({
      limit: 10,
      facultyId: 3,
      query: "analytics",
      cursor: "abc",
      sort: "most-viewed",
    });
  });

  it("accepts all gallery sort options", () => {
    for (const sort of ["newest", "most-liked", "most-viewed"] as const) {
      expect(listPublicInput.parse({ sort }).sort).toBe(sort);
    }
  });

  it("rejects unknown sort options", () => {
    expect(() => listPublicInput.parse({ sort: "trending" })).toThrow();
  });

  it("trims query whitespace", () => {
    const parsed = listPublicInput.parse({ query: "  finance  " });
    expect(parsed.query).toBe("finance");
  });

  it("rejects empty query strings", () => {
    expect(() => listPublicInput.parse({ query: "   " })).toThrow();
  });

  it("rejects out-of-range limits", () => {
    expect(() => listPublicInput.parse({ limit: 0 })).toThrow();
    expect(() => listPublicInput.parse({ limit: 51 })).toThrow();
  });
});
