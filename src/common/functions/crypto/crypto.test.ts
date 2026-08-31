import { afterEach, describe, expect, it, vi } from "vitest";

import { decrypt } from "./decrypt";
import { encrypt } from "./encrypt";
import { getKey } from "./getKey";
import { hash } from "./hash";
import { md5 } from "./md5";
import { rotatingSaltStartOfHour } from "./rotatingSaltStartOfHour";
import { rotatingSaltStartOfMonth } from "./rotatingSaltStartOfMonth";
import { secret } from "./secret";
import { uuid } from "./uuid";

const KEY = "correct horse battery staple";
const SHA512_HEX = /^[0-9a-f]{128}$/;

afterEach(() => {
  vi.useRealTimers();
});

describe("encrypt / decrypt", () => {
  it("round-trips a string through encrypt -> decrypt", () => {
    expect(decrypt(encrypt("hello world", KEY), KEY)).toBe("hello world");
  });

  it("round-trips empty and unicode payloads", () => {
    expect(decrypt(encrypt("", KEY), KEY)).toBe("");
    expect(decrypt(encrypt("日本語 🔐", KEY), KEY)).toBe("日本語 🔐");
  });

  it("coerces non-string values with String() before encrypting", () => {
    expect(decrypt(encrypt(12345, KEY), KEY)).toBe("12345");
  });

  it("emits a fresh base64 ciphertext each call (random iv + salt)", () => {
    expect(encrypt("same", KEY)).not.toBe(encrypt("same", KEY));
  });

  it("throws when decrypting with the wrong key", () => {
    const token = encrypt("secret payload", KEY);
    expect(() => decrypt(token, "wrong key")).toThrow();
  });

  it("throws on a tampered ciphertext (GCM auth tag mismatch)", () => {
    const buf = Buffer.from(encrypt("secret payload", KEY), "base64");
    buf[buf.length - 1] = (buf[buf.length - 1] ?? 0) ^ 0x01;
    expect(() => decrypt(buf.toString("base64"), KEY)).toThrow();
  });
});

describe("getKey", () => {
  it("derives a 32-byte key (aes-256)", () => {
    const key = getKey("pw", Buffer.from("salt"));
    expect(Buffer.isBuffer(key)).toBe(true);
    expect(key).toHaveLength(32);
  });

  it("is deterministic for the same password + salt", () => {
    const salt = Buffer.from("fixed salt");
    expect(getKey("pw", salt).toString("hex")).toBe(
      getKey("pw", salt).toString("hex"),
    );
  });

  it("changes with the password", () => {
    const salt = Buffer.from("fixed salt");
    expect(getKey("pw1", salt).toString("hex")).not.toBe(
      getKey("pw2", salt).toString("hex"),
    );
  });

  it("changes with the salt", () => {
    expect(getKey("pw", Buffer.from("salt a")).toString("hex")).not.toBe(
      getKey("pw", Buffer.from("salt b")).toString("hex"),
    );
  });
});

describe("hash", () => {
  it("returns a 128-char sha512 hex digest", () => {
    expect(hash("abc")).toMatch(SHA512_HEX);
  });

  it("is deterministic and joins its args before hashing", () => {
    expect(hash("abc")).toBe(hash("abc"));
    expect(hash("ab", "c")).toBe(hash("abc"));
  });

  it("differs for different input", () => {
    expect(hash("abc")).not.toBe(hash("abd"));
  });
});

describe("md5", () => {
  it("returns the known md5 hex digest", () => {
    expect(md5("abc")).toBe("900150983cd24fb0d6963f7d28e17f72");
  });

  it("joins its args before hashing", () => {
    expect(md5("a", "bc")).toBe(md5("abc"));
  });
});

describe("secret", () => {
  it("returns a deterministic 128-char sha512 hex digest", () => {
    expect(secret()).toMatch(SHA512_HEX);
    expect(secret()).toBe(secret());
  });
});

describe("uuid", () => {
  it("returns a random v4 uuid when called with no args", () => {
    expect(uuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(uuid()).not.toBe(uuid());
  });

  it("is a deterministic v5 uuid when called with args", () => {
    expect(uuid("a", "b")).toBe(uuid("a", "b"));
    expect(uuid("x")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("is sensitive to each arg", () => {
    expect(uuid("a", "b")).not.toBe(uuid("x", "b"));
    expect(uuid("a", "b")).not.toBe(uuid("a", "x"));
  });
});

describe("rotatingSaltStartOfHour", () => {
  it("is constant within the hour and changes across the boundary", () => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date("2026-07-15T12:15:00Z"));
    const a = rotatingSaltStartOfHour();
    vi.setSystemTime(new Date("2026-07-15T12:25:00Z"));
    const b = rotatingSaltStartOfHour();
    vi.setSystemTime(new Date("2026-07-15T15:15:00Z"));
    const c = rotatingSaltStartOfHour();

    expect(a).toMatch(SHA512_HEX);
    expect(b).toBe(a);
    expect(c).not.toBe(a);
  });
});

describe("rotatingSaltStartOfMonth", () => {
  it("is constant within the month and changes across the boundary", () => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date("2026-07-10T12:00:00Z"));
    const a = rotatingSaltStartOfMonth();
    vi.setSystemTime(new Date("2026-07-20T12:00:00Z"));
    const b = rotatingSaltStartOfMonth();
    vi.setSystemTime(new Date("2026-09-10T12:00:00Z"));
    const c = rotatingSaltStartOfMonth();

    expect(a).toMatch(SHA512_HEX);
    expect(b).toBe(a);
    expect(c).not.toBe(a);
  });
});
