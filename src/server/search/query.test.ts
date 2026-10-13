import { describe, expect, it } from "vitest";

import { buildTsQuery, escapeLike, toCodeKey } from "./query";

describe("buildTsQuery", () => {
  const vectors: [string, string | null][] = [
    ["statistics", "statistics:*"],
    ["intro to computing", "intro:* & to:* & computing:*"],
    ["C++", "C:*"],
    ["A&F", "A:* & F:*"],
    ["(IS216)", "IS216:*"],
    ["!crab | fish", "crab:* & fish:*"],
    ["a:b*", "a:* & b:*"],
    ["O'Brien", "O:* & Brien:*"],
    ["back\\slash", "back:* & slash:*"],
    ["COR-STAT1202", "COR:* & STAT1202:*"],
    ["ACCT102", "ACCT102:*"],
    ["René Müller", "René:* & Müller:*"],
    ["日本語", "日本語:*"],
    ["; SELECT * FROM courses;--", "SELECT:* & FROM:* & courses:*"],
    ["a b c d e f g h i j", "a:* & b:* & c:* & d:* & e:* & f:* & g:* & h:*"],
    ["  computing  ", "computing:*"],
    ["a  b", "a:* & b:*"],
  ];

  it.each(vectors)(
    "returns expected tsquery for %s",
    (input, expectedOutput) => {
      expect(buildTsQuery(input)).toBe(expectedOutput);
    },
  );

  it("returns null for empty queries and queries without alphanumeric characters", () => {
    expect(buildTsQuery("")).toBeNull();
    expect(buildTsQuery("   ")).toBeNull();
    expect(buildTsQuery("&&& (( ::")).toBeNull();
  });
});

describe("toCodeKey", () => {
  it("normalizes course code strings dash- and space-insensitively", () => {
    expect(toCodeKey("COR STAT1202")).toBe("CORSTAT1202");
    expect(toCodeKey("COR STAT 1202")).toBe("CORSTAT1202");
    expect(toCodeKey("COR-STAT1202")).toBe("CORSTAT1202");
    expect(toCodeKey("cor-stat 1202")).toBe("CORSTAT1202");
    expect(toCodeKey("COR\u2013STAT1202")).toBe("CORSTAT1202");
  });

  it("returns empty string for empty or whitespace-only queries", () => {
    expect(toCodeKey("   ")).toBe("");
  });
});

describe("escapeLike", () => {
  const vectors: [string, string][] = [
    ["100%", "100\\%"],
    ["a_b", "a\\_b"],
    ["c:\\x", "c:\\\\x"],
    ["plain", "plain"],
  ];

  it.each(vectors)(
    "escapes LIKE metacharacters correctly for %s",
    (input, expectedOutput) => {
      expect(escapeLike(input)).toBe(expectedOutput);
    },
  );
});
