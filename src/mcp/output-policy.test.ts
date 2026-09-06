// src/mcp/output-policy.test.ts
import { describe, expect, it } from "vitest";
import {
  appendLinks,
  capPage,
  DEFAULT_MAX_OUTPUT_CHARS,
  stripSecrets,
  stripSecretsFromValue,
  truncate,
} from "./output-policy";
describe("stripSecrets", () => {
  it("removes shareToken, icalToken, and notes from JSON payloads", () => {
    const out = stripSecrets(
      JSON.stringify({
        shareToken: "s",
        icalToken: "i",
        notes: "n",
        code: "C",
      }),
    );
    expect(out).not.toMatch(/shareToken|icalToken|"notes"/);
    expect(out).toMatch(/"code"/);
  });

  it("strips nested bearer keys at every depth, preserving siblings", () => {
    const out = stripSecrets(
      JSON.stringify({
        timetable: { shareToken: "s", name: "A" },
        bids: [{ icalToken: "i", notes: { strategy: "x" }, amount: 10 }],
        code: "C",
      }),
    );
    expect(out).not.toMatch(/shareToken|icalToken|"notes"/);
    const parsed = JSON.parse(out) as {
      timetable: { name: string };
      bids: Array<{ amount: number }>;
    };
    expect(parsed.timetable.name).toBe("A");
    expect(parsed.bids[0]!.amount).toBe(10);
  });

  it("redacts embedded secret patterns in non-JSON text", () => {
    const out = stripSecrets(
      'prefix "shareToken": "abc123" middle "notes": {"a": 1} suffix',
    );
    expect(out).not.toContain("abc123");
    expect(out).not.toContain('{"a": 1}');
    expect(out).toMatch(/prefix/);
    expect(out).toMatch(/suffix/);
  });

  it("returns non-matching non-JSON input unchanged and never throws", () => {
    expect(stripSecrets("plain text")).toBe("plain text");
    expect(stripSecrets("")).toBe("");
    expect(stripSecrets("unterminated {")).toBe("unterminated {");
  });

  it("leaves clean JSON byte-identical (no re-stringify)", () => {
    const clean = JSON.stringify({ code: "C", amount: 10 });
    expect(stripSecrets(clean)).toBe(clean);
  });
});

describe("stripSecretsFromValue", () => {
  it("removes all three keys from nested values without a JSON round-trip", () => {
    const out = stripSecretsFromValue({
      visibility: "UNLISTED",
      shareToken: "s",
      icalToken: "i",
      nested: { notes: "n", keep: 1 },
    });
    expect(out).toEqual({ visibility: "UNLISTED", nested: { keep: 1 } });
  });
});

describe("truncate", () => {
  it("is a no-op under the limit", () => {
    expect(truncate("abc", 10)).toBe("abc");
    expect(truncate("abc")).toBe("abc");
  });

  it("appends the truncation note over the limit, defaulting to 24_000", () => {
    expect(DEFAULT_MAX_OUTPUT_CHARS).toBe(24_000);
    const out = truncate("abcdefghij", 4, "…");
    expect(out).toBe("abcd…");
    const big = "x".repeat(DEFAULT_MAX_OUTPUT_CHARS + 1);
    expect(truncate(big)).toMatch(/\[truncated/);
  });
});

describe("capPage", () => {
  it("defaults limit 20 / offset 0 and clamps limit to max 50", () => {
    expect(capPage({})).toMatchObject({ limit: 20, offset: 0 });
    expect(capPage({ limit: 100, offset: -5 })).toMatchObject({
      limit: 50,
      offset: 0,
    });
    expect(capPage({ limit: 5, offset: 10 })).toMatchObject({
      limit: 5,
      offset: 10,
    });
  });
});

describe("appendLinks", () => {
  it("appends one link per line and skips empty links", () => {
    expect(appendLinks("base", ["/course/A", null, "/timetable"])).toBe(
      "base\n/course/A\n/timetable",
    );
    expect(appendLinks("base", [null, undefined, ""])).toBe("base");
  });
});
