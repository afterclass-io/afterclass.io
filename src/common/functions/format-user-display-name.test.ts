import { describe, expect, it } from "vitest";

import { formatUserDisplayName, getNameInitials } from "./format-user-display-name";

describe("formatUserDisplayName", () => {
  it("joins first and last name", () => {
    expect(formatUserDisplayName({ firstName: "Alice", lastName: "Tan" })).toBe(
      "Alice Tan",
    );
  });

  it("uses whichever name part is present and trims whitespace", () => {
    expect(formatUserDisplayName({ firstName: " Ben ", lastName: null })).toBe("Ben");
    expect(formatUserDisplayName({ firstName: undefined, lastName: "Lim" })).toBe("Lim");
  });

  it("falls back to Student and never to username-like data", () => {
    expect(formatUserDisplayName({ firstName: null, lastName: null })).toBe("Student");
    expect(formatUserDisplayName({ firstName: "  ", lastName: "" })).toBe("Student");
    const withUsername = { firstName: null, lastName: null, username: "user_d95f1597" };
    expect(formatUserDisplayName(withUsername)).toBe("Student");
  });
});

describe("getNameInitials", () => {
  it("returns first and last initials", () => {
    expect(getNameInitials("Alice Tan")).toBe("AT");
    expect(getNameInitials("Mary Jane Watson")).toBe("MW");
  });

  it("handles single names and empty input", () => {
    expect(getNameInitials("Ben")).toBe("B");
    expect(getNameInitials("  ")).toBe("S");
  });
});
