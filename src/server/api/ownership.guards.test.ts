import { describe, expect, it, vi } from "vitest";
import {
  requireOwnedBid,
  requireOwnedPoll,
  requireOwnedRoadmap,
  requireOwnedTimetable,
} from "./ownership";

// Complements ownership.test.ts: that file covers owner / other-owner /
// missing for roadmap, timetable and bid, plus type-level select checks.
// These cases pin the Prisma arguments the guards send, and cover
// requireOwnedPoll, which ownership.test.ts does not exercise.

describe("requireOwnedRoadmap select scoping", () => {
  it("adds userId to the caller's select before querying", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "r1", userId: "u1" });
    const db = { userRoadmap: { findUnique } };

    await requireOwnedRoadmap(db as never, "r1", "u1", { id: true });

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "r1" },
      select: { id: true, userId: true },
    });
  });
});

describe("requireOwnedTimetable select scoping", () => {
  it("adds userId to the caller's select before querying", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "t1", userId: "u1" });
    const db = { userTimetable: { findUnique } };

    await requireOwnedTimetable(db as never, "t1", "u1", { id: true });

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "t1" },
      select: { id: true, userId: true },
    });
  });
});

describe("requireOwnedBid select scoping", () => {
  it("adds userId to the caller's select before querying", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "b1", userId: "u1" });
    const db = { userBid: { findUnique } };

    await requireOwnedBid(db as never, "b1", "u1", { id: true });

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "b1" },
      select: { id: true, userId: true },
    });
  });
});

describe("requireOwnedPoll", () => {
  it("returns the row when the caller is the creator", async () => {
    const db = {
      meetingPoll: {
        findUnique: vi.fn().mockResolvedValue({ id: "p1", creatorId: "u1" }),
      },
    };
    const row = await requireOwnedPoll(db as never, { id: "p1" }, "u1");
    expect(row.id).toBe("p1");
  });

  it("throws FORBIDDEN when another user created the poll", async () => {
    const db = {
      meetingPoll: {
        findUnique: vi.fn().mockResolvedValue({ id: "p1", creatorId: "u2" }),
      },
    };
    await expect(
      requireOwnedPoll(db as never, { id: "p1" }, "u1"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws FORBIDDEN when the poll is missing", async () => {
    const db = {
      meetingPoll: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    await expect(
      requireOwnedPoll(db as never, { slug: "missing" }, "u1"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("looks up by slug when given a slug", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "p1", creatorId: "u1" });
    const db = { meetingPoll: { findUnique } };

    await requireOwnedPoll(db as never, { slug: "spring-poll" }, "u1");

    expect(findUnique).toHaveBeenCalledWith({
      where: { slug: "spring-poll" },
    });
  });

  it("adds creatorId to the caller's select before querying", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "p1", creatorId: "u1" });
    const db = { meetingPoll: { findUnique } };

    await requireOwnedPoll(db as never, { id: "p1" }, "u1", { id: true });

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "p1" },
      select: { id: true, creatorId: true },
    });
  });
});
