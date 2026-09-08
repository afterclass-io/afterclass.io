import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

import {
  idb as db,
  randBoss,
  seedAcadTerm,
  seedCourse,
  seedProfessor,
} from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";

import { getAll } from "./getAll";
import { getAllByCourseId } from "./getAllByCourseId";

const router = createTRPCRouter({ getAll, getAllByCourseId });

const call = () => makeCaller(router.createCaller, db, null);

let code: string;
let slug: string;
let courseId: string;
let termEarly: string;
let termLate: string;
let earlyClassId: string;

beforeAll(async () => {
  const suffix = randomUUID();
  code = `CLS${suffix.slice(0, 8)}`;
  slug = `cls-prof-${suffix}`;
  // Deterministic term ids so the `acadTermId: "desc"` ordering is assertable
  // (the injected term's id is random hex).
  termEarly = `${suffix}-AY1`;
  termLate = `${suffix}-AY2`;
  await Promise.all([
    seedAcadTerm(db, { id: termEarly, acadYearStart: 2023 }),
    seedAcadTerm(db, { id: termLate, acadYearStart: 2024 }),
  ]);

  const course = await seedCourse(db, { code, name: "Classes Course" });
  courseId = course.id;
  const professor = await seedProfessor(db, {
    name: "Classes Professor",
    slug,
  });

  const timing = (dayOfWeek: string, startTime: string, endTime: string) => ({
    create: [
      {
        startDate: new Date("2024-08-01"),
        endDate: new Date("2024-11-01"),
        dayOfWeek,
        startTime,
        endTime,
        venue: "SR1",
      },
    ],
  });

  // Seed G3 before G1 to prove the `section: "asc"` secondary sort.
  await db.classes.create({
    data: {
      section: "G3",
      courseId,
      acadTermId: termLate,
      bossId: randBoss(),
      classTimings: timing("Wed", "16:00", "18:00"),
    },
  });
  await db.classes.create({
    data: {
      section: "G1",
      courseId,
      professorId: professor.id,
      acadTermId: termLate,
      bossId: randBoss(),
      classTimings: timing("Mon", "12:00", "14:00"),
    },
  });
  const earlyClass = await db.classes.create({
    data: {
      section: "G2",
      courseId,
      professorId: professor.id,
      acadTermId: termEarly,
      bossId: randBoss(),
      classTimings: timing("Mon", "09:00", "11:00"),
    },
  });
  earlyClassId = earlyClass.id;
});

describe("classes.getAllByCourseId (integration)", () => {
  it("returns every term's classes for the course, newest term first", async () => {
    const res = await call().getAllByCourseId({ courseId });
    expect(res).toHaveLength(3);
    expect(res.map((c) => c.acadTermId)).toEqual([
      termLate,
      termLate,
      termEarly,
    ]);
  });

  it("narrows to a single term when acadTermId is given", async () => {
    const res = await call().getAllByCourseId({
      courseId,
      acadTermId: termEarly,
    });
    expect(res.map((c) => c.section)).toEqual(["G2"]);
  });
});

describe("classes.getAll (integration)", () => {
  it("filters by course code + term and sorts by section asc", async () => {
    const res = await call().getAll({ courseCode: code, acadTermId: termLate });
    expect(res.map((c) => c.section)).toEqual(["G1", "G3"]);
  });

  it("keeps only classes with a timing on the given day", async () => {
    const res = await call().getAll({
      courseCode: code,
      acadTermId: termLate,
      day: "Mon",
    });
    expect(res.map((c) => c.section)).toEqual(["G1"]);
  });

  it("keeps only classes starting after the given time", async () => {
    const res = await call().getAll({
      courseCode: code,
      acadTermId: termLate,
      startsAfter: "15:00",
    });
    expect(res.map((c) => c.section)).toEqual(["G3"]);
  });

  it("keeps only classes ending before the given time", async () => {
    const res = await call().getAll({
      courseCode: code,
      acadTermId: termLate,
      endsBefore: "15:00",
    });
    expect(res.map((c) => c.section)).toEqual(["G1"]);
  });

  it("looks a class up by id without forcing a term default", async () => {
    const res = await call().getAll({ id: earlyClassId });
    expect(res.map((c) => c.section)).toEqual(["G2"]);
  });

  it("filters by professor slug", async () => {
    const res = await call().getAll({ profSlug: slug, acadTermId: termLate });
    expect(res.map((c) => c.section)).toEqual(["G1"]);
  });
});
