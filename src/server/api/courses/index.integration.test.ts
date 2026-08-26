import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, inject, it } from "vitest";

import {
  idb as db,
  randBoss,
  seedCourse,
  seedProfessor,
  seedUser,
} from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";

import { countByProfSlug } from "./countByProfSlug";
import { getAllByUniAbbrv } from "./getAllByUniAbbrv";
import { getByCourseCode } from "./getByCourseCode";
import { getByProfSlug } from "./getByProfSlug";

const router = createTRPCRouter({
  countByProfSlug,
  getAllByUniAbbrv,
  getByCourseCode,
  getByProfSlug,
});

const universityId = inject("universityId");
const facultyId = inject("facultyId");
const acadTermId = inject("acadTermId");

const call = () => makeCaller(router.createCaller, db, null);

let slug: string;
let course1Code: string;
let course1Id: string;
let course2Id: string;

beforeAll(async () => {
  const suffix = randomUUID();
  slug = `crs-prof-${suffix}`;
  course1Code = `CRS1${suffix.slice(0, 8)}`;

  const [prof, prof2] = await Promise.all([
    seedProfessor(db, { name: "Courses Professor", slug }),
    seedProfessor(db, { name: "Other Professor", slug: `crs-prof2-${suffix}` }),
  ]);

  const [course1, course2] = await Promise.all([
    seedCourse(db, { code: course1Code, name: "Course One" }),
    seedCourse(db, { code: `CRS2${suffix.slice(0, 8)}`, name: "Course Two" }),
  ]);
  course1Id = course1.id;
  course2Id = course2.id;

  // course1 has two classes taught by two distinct professors → the distinct
  // -professor Set collapses `_count.classes` to 2. prof also teaches course2,
  // so `getByProfSlug` must still return only course1 (WHERE some class has the
  // slug) — but course2 is not linked to prof, so it never appears.
  await db.classes.createMany({
    data: [
      {
        section: "G1",
        courseId: course1Id,
        professorId: prof.id,
        acadTermId,
        bossId: randBoss(),
      },
      {
        section: "G2",
        courseId: course1Id,
        professorId: prof2.id,
        acadTermId,
        bossId: randBoss(),
      },
    ],
  });

  const reviewer = await seedUser(db);
  await db.reviews.create({
    data: {
      body: "a".repeat(200),
      rating: 4,
      reviewedCourseId: course1Id,
      reviewedProfessorId: prof.id,
      reviewedUniversityId: universityId,
      reviewedFacultyId: facultyId,
      reviewerId: reviewer.id,
    },
  });
});

describe("courses.getByCourseCode (integration)", () => {
  it("returns the course with its faculty and university joined", async () => {
    const res = await call().getByCourseCode({ code: course1Code });
    expect(res).toMatchObject({
      id: course1Id,
      code: course1Code,
      name: "Course One",
      belongToUniversity: { abbrv: "SMU" },
      belongToFaculty: { id: facultyId },
    });
  });

  it("returns null for an unknown code", async () => {
    expect(
      await call().getByCourseCode({ code: "NOPE-does-not-exist" }),
    ).toBeNull();
  });
});

describe("courses.getByProfSlug (integration)", () => {
  it("returns the prof's courses with distinct-professor and scoped-review counts", async () => {
    const res = await call().getByProfSlug({ slug });
    expect(res.map((c) => c.id)).toEqual([course1Id]);
    expect(res[0]!._count.classes).toBe(2); // two distinct professors
    expect(res[0]!._count.reviews).toBe(1); // one review by this prof
  });
});

describe("courses.countByProfSlug (integration)", () => {
  it("counts only courses the professor teaches", async () => {
    expect(await call().countByProfSlug({ slug })).toBe(1);
  });
});

describe("courses.getAllByUniAbbrv (integration)", () => {
  it("returns id/name/code triples for the university's courses", async () => {
    const res = await call().getAllByUniAbbrv({ universityAbbrv: "SMU" });
    // Globally unscoped (every test file's courses share the injected SMU) —
    // assert on our own row and its exact column set.
    const found = res.find((c) => c.id === course1Id);
    expect(found).toEqual({
      id: course1Id,
      name: "Course One",
      code: course1Code,
    });
    expect(res.some((c) => c.id === course2Id)).toBe(true);
  });
});
