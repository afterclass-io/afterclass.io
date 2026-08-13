import { describe, expect, it, vi } from "vitest";
import { assertClassInTerm } from "./assertClassInTerm";

describe("assertClassInTerm", () => {
  it("passes when the class belongs to the term", async () => {
    const db = { classes: { findUnique: vi.fn().mockResolvedValue({ acadTermId: "term-a" }) } };
    await expect(assertClassInTerm(db as never, "c1", "term-a")).resolves.toBeUndefined();
  });

  it("throws BAD_REQUEST for a cross-term class", async () => {
    const db = { classes: { findUnique: vi.fn().mockResolvedValue({ acadTermId: "term-b" }) } };
    await expect(assertClassInTerm(db as never, "c1", "term-a")).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws BAD_REQUEST for a missing class", async () => {
    const db = { classes: { findUnique: vi.fn().mockResolvedValue(null) } };
    await expect(assertClassInTerm(db as never, "c1", "term-a")).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
