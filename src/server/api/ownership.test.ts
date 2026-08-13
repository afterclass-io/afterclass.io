import { describe, expect, it, vi } from "vitest";
import {
  mintToken,
  requireOwnedBid,
  requireOwnedRoadmap,
  requireOwnedTimetable,
} from "./ownership";

describe("requireOwned*", () => {
  it("returns the row when owned", async () => {
    const db = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({ id: "r1", userId: "u1" }),
      },
    };
    const row = await requireOwnedRoadmap(db as never, "r1", "u1");
    expect(row.id).toBe("r1");
  });

  it("throws FORBIDDEN when the row belongs to another user", async () => {
    const db = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({ id: "r1", userId: "u2" }),
      },
    };
    await expect(
      requireOwnedRoadmap(db as never, "r1", "u1"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws FORBIDDEN when the row is missing", async () => {
    const db = {
      userRoadmap: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    await expect(
      requireOwnedRoadmap(db as never, "r1", "u1"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requireOwnedTimetable returns the row when owned", async () => {
    const db = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({ id: "t1", userId: "u1" }),
      },
    };
    const row = await requireOwnedTimetable(db as never, "t1", "u1");
    expect(row.id).toBe("t1");
  });

  it("requireOwnedTimetable throws FORBIDDEN when not owned", async () => {
    const db = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({ id: "t1", userId: "u2" }),
      },
    };
    await expect(
      requireOwnedTimetable(db as never, "t1", "u1"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requireOwnedTimetable throws FORBIDDEN when the row is missing", async () => {
    const db = {
      userTimetable: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    await expect(
      requireOwnedTimetable(db as never, "t1", "u1"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requireOwnedBid returns the row when owned", async () => {
    const db = {
      userBid: {
        findUnique: vi.fn().mockResolvedValue({ id: "b1", userId: "u1" }),
      },
    };
    const row = await requireOwnedBid(db as never, "b1", "u1");
    expect(row.id).toBe("b1");
  });

  it("requireOwnedBid throws FORBIDDEN when not owned", async () => {
    const db = {
      userBid: {
        findUnique: vi.fn().mockResolvedValue({ id: "b1", userId: "u2" }),
      },
    };
    await expect(
      requireOwnedBid(db as never, "b1", "u1"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requireOwnedBid throws FORBIDDEN when the row is missing", async () => {
    const db = {
      userBid: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    await expect(
      requireOwnedBid(db as never, "b1", "u1"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("mintToken", () => {
  it("returns a 21-char nanoid", () => {
    expect(mintToken()).toHaveLength(21);
  });
});
