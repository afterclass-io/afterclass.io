import { describe, expect, it } from "vitest";

import { normalizeSearchQuery } from "./query-normalize";

describe("normalizeSearchQuery", () => {
  it("trims leading and trailing whitespace", () => {
    expect(normalizeSearchQuery("  ACCT102  ")).toBe("ACCT102");
    expect(normalizeSearchQuery("  GOH Jing Rong  ")).toBe("GOH Jing Rong");
  });

  it("collapses internal whitespace runs to a single space", () => {
    expect(normalizeSearchQuery("GOH  Jing   Rong")).toBe("GOH Jing Rong");
  });

  it("strips commas/semicolons from professor names", () => {
    expect(normalizeSearchQuery("GOH, Jing Rong")).toBe("GOH Jing Rong");
    expect(normalizeSearchQuery("TAN, Kevin; SMITH")).toBe("TAN Kevin SMITH");
  });

  it("collapses spaces in course codes so 'ACCT 102' -> 'ACCT102'", () => {
    expect(normalizeSearchQuery("ACCT 102")).toBe("ACCT102");
  });

  it("collapses spaces in dotted course codes so 'COR IS1702' -> 'CORIS1702'", () => {
    expect(normalizeSearchQuery("COR IS1702")).toBe("CORIS1702");
  });

  it("leaves already-normalized codes unchanged", () => {
    expect(normalizeSearchQuery("ACCT102")).toBe("ACCT102");
    expect(normalizeSearchQuery("COR-STAT1202")).toBe("COR-STAT1202");
  });

  it("does not collapse spaces in professor names (keeps single-space separation)", () => {
    expect(normalizeSearchQuery("GOH Jing Rong")).toBe("GOH Jing Rong");
  });

  it("returns an empty string for empty or whitespace-only input", () => {
    expect(normalizeSearchQuery("")).toBe("");
    expect(normalizeSearchQuery("   ")).toBe("");
  });

  it("keeps single-char queries as-is (min-length guard is the caller's job)", () => {
    expect(normalizeSearchQuery("a")).toBe("a");
  });
});
