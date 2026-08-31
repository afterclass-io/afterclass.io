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

import { countByCourseCode } from "./countByCourseCode";
import { getAllByUniAbbrv } from "./getAllByUniAbbrv";
import { getByCourseCode } from "./getByCourseCode";
import { getBySlug } from "./getBySlug";
import { getProfessorsByClassId } from "./getByClassId";

const router = createTRPCRouter({
  countByCourseCode,
  getAllByUniAbbrv,
  getByCourseCode,
  getBySlug,
  getProfessorsByClassId,
});

const universityId = inject("universityId");
const facultyId = inject("facultyId");
const acadTermId = inject("acadTermId");

const call = () => makeCaller(router.createCaller, db, null);

let slug1: string;
let slug2: string;
let prof1Id: string;
let courseCode: string;
let class1Id: string;

beforeAll(async () => {
  const suffix = randomUUID();
  slug1 = `prf1-${suffix}`;
  slug2 = `prf2-${suffix}`;
  courseCode = `PRF${suffix.slice(0, 8)}`;

  const [prof1, prof2] = await Promise.all([
    seedProfessor(db, { name: "Prof One", slug: slug1 }),
    seedProfessor(db, { name: "Prof Two", slug: slug2 }),
  ]);
  prof1Id = prof1.id;

  const [course, course2] = await Promise.all([
    seedCourse(db, { code: courseCode, name: "Prof Course" }),
    seedCourse(db, {
      code: `PRF2${suffix.slice(0, 8)}`,
      name: "Prof Course Two",
    }),
  ]);

  // prof1 teaches `course` (class1) and `course2` (class3) → distinct-course
  // count 2. prof2 teaches only `course` (class2) → distinct-course count 1.
  const class1 = await db.classes.create({
    data: {
      section: "G1",
      courseId: course.id,
      professorId: prof1.id,
      acadTermId,
      bossId: randBoss(),
    },
  });
  class1Id = class1.id;
  await db.classes.createMany({
    data: [
      {
        section: "G2",
        courseId: course.id,
        professorId: prof2.id,
        acadTermId,
        bossId: randBoss(),
      },
      {
        section: "G1",
        courseId: course2.id,
        professorId: prof1.id,
        acadTermId,
        bossId: randBoss(),
      },
    ],
  });

  const reviewer = await seedUser(db);
  await db.reviews.create({
    data: {
      body: "a".repeat(200),
      rating: 3,
      reviewedCourseId: course.id,
      reviewedProfessorId: prof1.id,
      reviewedUniversityId: universityId,
      reviewedFacultyId: facultyId,
      reviewerId: reviewer.id,
    },
  });
});

describe("professors.getBySlug (integration)", () => {
  it("returns the professor with its university joined", async () => {
    const res = await call().getBySlug({ slug: slug1 });
    expect(res).toMatchObject({
      id: prof1Id,
      slug: slug1,
      name: "Prof One",
      belongToUniversity: { abbrv: "SMU" },
    });
  });

  it("returns null for an unknown slug", async () => {
    expect(await call().getBySlug({ slug: "nope-missing" })).toBeNull();
  });
});

describe("professors.getByCourseCode (integration)", () => {
  it("returns every professor teaching the course with distinct-course and scoped-review counts", async () => {
    const res = await call().getByCourseCode({ code: courseCode });
    expect(res.map((p) => p.slug).toSorted()).toEqual(
      [slug1, slug2].toSorted(),
    );

    const p1 = res.find((p) => p.slug === slug1)!;
    const p2 = res.find((p) => p.slug === slug2)!;
    expect(p1._count.classes).toBe(2); // teaches two distinct courses
    expect(p1._count.reviews).toBe(1);
    expect(p2._count.classes).toBe(1);
    expect(p2._count.reviews).toBe(0);
  });
});

describe("professors.countByCourseCode (integration)", () => {
  it("counts the professors teaching the course", async () => {
    expect(await call().countByCourseCode({ courseCode })).toBe(2);
  });
});

describe("professors.getProfessorsByClassId (integration)", () => {
  it("returns name/slug for the professor of the given class", async () => {
    const res = await call().getProfessorsByClassId({ classId: class1Id });
    expect(res).toEqual([{ name: "Prof One", slug: slug1 }]);
  });
});

describe("professors.getAllByUniAbbrv (integration)", () => {
  it("returns id/name/slug triples for the university's professors", async () => {
    const res = await call().getAllByUniAbbrv({ universityAbbrv: "SMU" });
    // Globally unscoped — assert our own row and its exact column set.
    const found = res.find((p) => p.id === prof1Id);
    expect(found).toEqual({ id: prof1Id, name: "Prof One", slug: slug1 });
  });
});
