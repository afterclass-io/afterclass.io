import { describe, expect, it, vi, beforeEach } from "vitest";

import { validateClassWindowPair } from "./validate-class-window";

function makeDb(windowRow: unknown, classRow: unknown) {
  return {
    bidWindow: { findUnique: vi.fn().mockResolvedValue(windowRow) },
    classes: { findUnique: vi.fn().mockResolvedValue(classRow) },
  };
}

describe("validateClassWindowPair", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an unknown bid window with BAD_REQUEST", async () => {
    const db = makeDb(null, { acadTermId: "term-a" });
    await expect(
      validateClassWindowPair(db as never, "c1", 999),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Unknown bid window",
    });
    expect(db.bidWindow.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
      select: { acadTermId: true },
    });
  });

  it("rejects a class that belongs to another term than the window", async () => {
    const db = makeDb({ acadTermId: "term-b" }, { acadTermId: "term-a" });
    await expect(
      validateClassWindowPair(db as never, "class-in-term-a", 7),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Class does not belong to this academic term",
    });
  });

  it("resolves when the class and window share a term", async () => {
    const db = makeDb({ acadTermId: "term-a" }, { acadTermId: "term-a" });
    await expect(
      validateClassWindowPair(db as never, "c1", 2),
    ).resolves.toBeUndefined();
    expect(db.classes.findUnique).toHaveBeenCalledWith({
      where: { id: "c1" },
      select: { acadTermId: true },
    });
  });
});
