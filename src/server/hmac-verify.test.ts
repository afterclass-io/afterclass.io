import { createHmac } from "crypto";

import { describe, expect, it } from "vitest";

import { verifyExpiringHmac } from "./hmac-verify";

const PREFIX = "user-1.save-bids.abc";
const SECRET = "s";

function sign(prefix: string, expiry: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${prefix}.${expiry}`)
    .digest("hex");
}

describe("verifyExpiringHmac", () => {
  it("accepts a valid, unexpired signature", () => {
    const expiry = String(Date.now() + 60_000);
    expect(
      verifyExpiringHmac({
        signedPrefix: PREFIX,
        expiry,
        signature: sign(PREFIX, expiry, SECRET),
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("rejects a tampered signature of the same length", () => {
    const expiry = String(Date.now() + 60_000);
    const sig = sign(PREFIX, expiry, SECRET);
    const tampered = sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");
    expect(
      verifyExpiringHmac({
        signedPrefix: PREFIX,
        expiry,
        signature: tampered,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rejects a signature of a different length without throwing", () => {
    const expiry = String(Date.now() + 60_000);
    expect(() =>
      verifyExpiringHmac({
        signedPrefix: PREFIX,
        expiry,
        signature: "abc",
        secret: SECRET,
      }),
    ).not.toThrow();
    expect(
      verifyExpiringHmac({
        signedPrefix: PREFIX,
        expiry,
        signature: "abc",
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rejects a non-numeric expiry even when it is signed", () => {
    const expiry = "12a";
    expect(
      verifyExpiringHmac({
        signedPrefix: PREFIX,
        expiry,
        signature: sign(PREFIX, expiry, SECRET),
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rejects an expired signature", () => {
    const expiry = String(Date.now() - 1_000);
    expect(
      verifyExpiringHmac({
        signedPrefix: PREFIX,
        expiry,
        signature: sign(PREFIX, expiry, SECRET),
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rejects when the signature or expiry is undefined", () => {
    const expiry = String(Date.now() + 60_000);
    expect(
      verifyExpiringHmac({
        signedPrefix: PREFIX,
        expiry,
        signature: undefined,
        secret: SECRET,
      }),
    ).toBe(false);
    expect(
      verifyExpiringHmac({
        signedPrefix: PREFIX,
        expiry: undefined,
        signature: sign(PREFIX, expiry, SECRET),
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rejects a signature made with a different secret", () => {
    const expiry = String(Date.now() + 60_000);
    expect(
      verifyExpiringHmac({
        signedPrefix: PREFIX,
        expiry,
        signature: sign(PREFIX, expiry, "other-secret"),
        secret: SECRET,
      }),
    ).toBe(false);
  });
});
