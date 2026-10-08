import { describe, expect, it } from "vitest";

import { emailValidationSchema } from "./schemas";

describe("emailValidationSchema", () => {
  it("rejects domains that only match as a suffix without a dot boundary", () => {
    expect(emailValidationSchema.safeParse("a@evilsmu.edu.sg").success).toBe(
      false,
    );
    expect(
      emailValidationSchema.safeParse("a@attacker-smu.edu.sg").success,
    ).toBe(false);
  });

  it("accepts exact domain and subdomains on host boundary", () => {
    expect(emailValidationSchema.safeParse("a@smu.edu.sg").success).toBe(true);
    expect(emailValidationSchema.safeParse("a@scis.smu.edu.sg").success).toBe(
      true,
    );
  });
});
