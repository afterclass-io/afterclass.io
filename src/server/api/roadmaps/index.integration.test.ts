import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, inject, it } from "vitest";

import {
  idb as db,
  seedCourse,
  seedUser,
} from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";

import { getById } from "./getById";
import { getMine } from "./getMine";
import { searchCourses } from "./searchCourses";

const router = createTRPCRouter({ getById, getMine, searchCourses });

const facultyId = inject("facultyId");

let ownerId: string;
let ownerUsername: string;
let voterId: string;
let publicRoadmapId: string;
let privateRoadmapId: string;
let courseCode: string;
let courseId: string;
let facultyName: string;
let facultyAcronym: string;

beforeAll(async () => {
  const suffix = randomUUID();
  courseCode = `RMX${suffix.slice(0, 8)}`;

  const faculty = await db.faculties.findUniqueOrThrow({
    where: { id: facultyId },
  });
  facultyName = faculty.name;
  facultyAcronym = faculty.acronym;

  const [owner, voter] = await Promise.all([seedUser(db), seedUser(db)]);
  ownerId = owner.id;
  ownerUsername = owner.username;
  voterId = voter.id;

  const course = await seedCourse(db, {
    code: courseCode,
    name: "Roadmap Search Course",
  });
  courseId = course.id;

  const publicRoadmap = await db.userRoadmap.create({
    data: {
      userId: ownerId,
      name: "Public Roadmap",
      description: "a public one",
      visibility: "PUBLIC",
      facultyId,
      publishedAt: new Date("2024-06-01"),
      entries: {
        create: [{ courseId, yearNumber: 1, term: "T1", sortOrder: 0 }],
      },
      votes: {
        create: [
          { userId: ownerId, weight: 1 },
          { userId: voterId, weight: 1 },
        ],
      },
    },
  });
  publicRoadmapId = publicRoadmap.id;

  const privateRoadmap = await db.userRoadmap.create({
    data: { userId: ownerId, name: "Private Roadmap" },
  });
  privateRoadmapId = privateRoadmap.id;
});

describe("roadmaps.getById (integration)", () => {
  it("returns a PUBLIC roadmap with owner, faculty pill and upvote count", async () => {
    const res = await makeCaller(router.createCaller, db, null).getById({
      id: publicRoadmapId,
    });
    expect(res).toMatchObject({
      ownerUsername,
      voteCount: 2,
      viewerHasVoted: false,
      ownerFaculty: { name: facultyName, acronym: facultyAcronym },
    });
    expect(res.entries).toHaveLength(1);
    expect(res.entries[0]!.course.code).toBe(courseCode);
  });

  it("reports viewerHasVoted true for a signed-in voter", async () => {
    const res = await makeCaller(router.createCaller, db, {
      user: { id: voterId },
    }).getById({ id: publicRoadmapId });
    expect(res.viewerHasVoted).toBe(true);
  });

  it("throws NOT_FOUND for a non-public roadmap", async () => {
    await expect(
      makeCaller(router.createCaller, db, null).getById({
        id: privateRoadmapId,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND for an unknown id", async () => {
    await expect(
      makeCaller(router.createCaller, db, null).getById({ id: randomUUID() }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("roadmaps.getMine (integration)", () => {
  it("returns the caller's own roadmap with entries", async () => {
    const res = await makeCaller(router.createCaller, db, {
      user: { id: ownerId },
    }).getMine({ roadmapId: privateRoadmapId });
    expect(res.roadmap.id).toBe(privateRoadmapId);
    expect(res.entries).toEqual([]);
  });

  it("throws FORBIDDEN when the roadmap is not the caller's", async () => {
    await expect(
      makeCaller(router.createCaller, db, { user: { id: voterId } }).getMine({
        roadmapId: privateRoadmapId,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("roadmaps.searchCourses (integration)", () => {
  it("returns id/code/name/creditUnits for courses matching the query", async () => {
    const res = await makeCaller(router.createCaller, db, null).searchCourses({
      query: courseCode,
    });
    expect(res).toEqual([
      {
        id: courseId,
        code: courseCode,
        name: "Roadmap Search Course",
        creditUnits: 1,
      },
    ]);
  });
});
