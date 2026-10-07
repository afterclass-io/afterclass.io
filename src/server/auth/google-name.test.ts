import { describe, expect, it } from "vitest";

import { getGoogleNameFields } from "./google-name";

describe("getGoogleNameFields", () => {
  it("reads and trims given and family names", () => {
    expect(
      getGoogleNameFields({ given_name: " Alice ", family_name: "Tan" }),
    ).toEqual({ firstName: "Alice", lastName: "Tan" });
  });

  it("omits missing or blank parts", () => {
    expect(getGoogleNameFields({ given_name: "Alice", family_name: " " })).toEqual({
      firstName: "Alice",
    });
    expect(getGoogleNameFields(null)).toEqual({});
  });
});
