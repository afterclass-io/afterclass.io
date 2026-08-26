import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";

import { getById } from "./index";

const router = createTRPCRouter({ getById });

function makeRoadmapRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "rm1",
    name: "My Roadmap",
    description: null,
    userId: "owner-1",
    facultyId: null,
    publishedAt: new Date("2024-01-01"),
    viewCount: 5,
    shareCount: 2,
    user: { username: "owner-name" },
    entries: [
      {
        id: "e1",
        courseId: "c1",
        yearNumber: 1,
        term: "T1",
        sortOrder: 0,
        course: { code: "CS101", name: "Intro", creditUnits: 1, description: "d" },
      },
    ],
    _count: { votes: 7 },
    ...overrides,
  };
}

function makeDb(row: unknown, opts: { vote?: unknown; faculty?: unknown } = {}) {
  return {
    userRoadmap: { findUnique: vi.fn().mockResolvedValue(row) },
    roadmapVote: {
      findUnique: vi.fn().mockResolvedValue(opts.vote ?? null),
    },
    faculties: {
      findUnique: vi.fn().mockResolvedValue(opts.faculty ?? null),
    },
  };
}

const anon = null;
const viewer = { user: { id: "viewer-1" } };

beforeEach(() => vi.clearAllMocks());

describe("roadmaps.getById", () => {
  it("throws NOT_FOUND when no PUBLIC roadmap matches", async () => {
    const db = makeDb(null);
    await expect(
      makeCaller(router.createCaller, db, anon).getById({ id: "missing" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("only looks for PUBLIC roadmaps", async () => {
    const db = makeDb(makeRoadmapRow());
    await makeCaller(router.createCaller, db, anon).getById({ id: "rm1" });
    expect(db.userRoadmap.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rm1", visibility: "PUBLIC" },
      }),
    );
  });

  it("maps owner, vote count and entries onto the response", async () => {
    const db = makeDb(makeRoadmapRow());
    const res = await makeCaller(router.createCaller, db, anon).getById({
      id: "rm1",
    });
    expect(res).toMatchObject({
      ownerUsername: "owner-name",
      voteCount: 7,
      viewerHasVoted: false,
      ownerFaculty: null,
    });
    expect(res.entries).toHaveLength(1);
  });

  it("does not query votes for an anonymous viewer", async () => {
    const db = makeDb(makeRoadmapRow());
    const res = await makeCaller(router.createCaller, db, anon).getById({
      id: "rm1",
    });
    expect(db.roadmapVote.findUnique).not.toHaveBeenCalled();
    expect(res.viewerHasVoted).toBe(false);
  });

  it("reports viewerHasVoted true when the signed-in viewer has an upvote", async () => {
    const db = makeDb(makeRoadmapRow(), { vote: { id: "v1" } });
    const res = await makeCaller(router.createCaller, db, viewer).getById({
      id: "rm1",
    });
    expect(db.roadmapVote.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          roadmapId_userId: { roadmapId: "rm1", userId: "viewer-1" },
          weight: 1,
        },
      }),
    );
    expect(res.viewerHasVoted).toBe(true);
  });

  it("reports viewerHasVoted false when the signed-in viewer has no upvote", async () => {
    const db = makeDb(makeRoadmapRow(), { vote: null });
    const res = await makeCaller(router.createCaller, db, viewer).getById({
      id: "rm1",
    });
    expect(res.viewerHasVoted).toBe(false);
  });

  it("skips the faculty lookup when the roadmap has no faculty", async () => {
    const db = makeDb(makeRoadmapRow({ facultyId: null }));
    const res = await makeCaller(router.createCaller, db, anon).getById({
      id: "rm1",
    });
    expect(db.faculties.findUnique).not.toHaveBeenCalled();
    expect(res.ownerFaculty).toBeNull();
  });

  it("resolves the faculty pill when the roadmap has a faculty", async () => {
    const db = makeDb(makeRoadmapRow({ facultyId: 3 }), {
      faculty: { name: "School of Computing", acronym: "SoC" },
    });
    const res = await makeCaller(router.createCaller, db, anon).getById({
      id: "rm1",
    });
    expect(db.faculties.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 3 } }),
    );
    expect(res.ownerFaculty).toEqual({
      name: "School of Computing",
      acronym: "SoC",
    });
  });

  it("leaves ownerFaculty null when the referenced faculty is gone", async () => {
    const db = makeDb(makeRoadmapRow({ facultyId: 3 }), { faculty: null });
    const res = await makeCaller(router.createCaller, db, anon).getById({
      id: "rm1",
    });
    expect(res.ownerFaculty).toBeNull();
  });
});
