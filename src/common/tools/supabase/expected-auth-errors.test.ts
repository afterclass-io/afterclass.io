import { describe, expect, it } from "vitest";

import { EXPECTED_SUPABASE_AUTH_ERRORS } from "./expected-auth-errors";

const isIgnored = (message: string) =>
  EXPECTED_SUPABASE_AUTH_ERRORS.some((pattern) => pattern.test(message));

describe("EXPECTED_SUPABASE_AUTH_ERRORS", () => {
  it("ignores ordinary user mistakes", () => {
    expect(isIgnored("Invalid login credentials")).toBe(true);
    expect(isIgnored("Email not confirmed")).toBe(true);
    expect(isIgnored("User already registered")).toBe(true);
  });

  it("keeps real failures visible", () => {
    expect(isIgnored("email rate limit exceeded")).toBe(false);
    expect(isIgnored("fetch failed")).toBe(false);
  });
});
