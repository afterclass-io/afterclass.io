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

import { getByCourseProfessor } from "./getByCourseProfessor";

const router = createTRPCRouter({ getByCourseProfessor });

const call = () => makeCaller(router.createCaller, db, null);

let courseCode: string;
let professorId: string;

beforeAll(async () => {
  // ponytail: this term's `acadYearStart` must stay within MAX_HISTORY_YEARS
  // (5) of the largest `acadYearStart` across ALL integration files —
  // findBidResults filters `bidWindow.acadTerm.acadYearStart >= (globalMax - 4)`.
  // Using the current year keeps it the max (other files seed 2023-2025).
  const term = (
    await seedAcadTerm(db, { acadYearStart: new Date().getFullYear() })
  ).id;

  const course = await seedCourse(db, { name: "Bid Results Course" });
  courseCode = course.code;
  const professor = await seedProfessor(db, { name: "Bid Results Prof" });
  professorId = professor.id;

  const cls = await db.classes.create({
    data: {
      section: "G1",
      courseId: course.id,
      professorId: professor.id,
      acadTermId: term,
      bossId: randBoss(),
    },
  });
  const bidWindow = await db.bidWindow.create({
    data: { acadTermId: term, round: "1", window: 1, resultsAt: new Date() },
  });
  await db.bidResult.create({
    data: {
      bidWindowId: bidWindow.id,
      classId: cls.id,
      vacancy: 5,
      beforeProcessVacancy: 10,
      enrolledStudents: 40,
      median: 12.5,
      min: 8,
    },
  });
});

describe("bidResults.getByCourseProfessor (integration)", () => {
  it("returns the class's bid results with window and course joins", async () => {
    const res = await call().getByCourseProfessor({ courseCode, professorId });
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      median: 12.5,
      min: 8,
      class: {
        course: { code: courseCode },
        professor: { name: "Bid Results Prof" },
      },
    });
  });

  it("returns [] when the course code is unknown", async () => {
    expect(
      await call().getByCourseProfessor({ courseCode: "NOPE", professorId }),
    ).toEqual([]);
  });

  it("returns [] when the professor id is unknown", async () => {
    expect(
      await call().getByCourseProfessor({
        courseCode,
        professorId: randomUUID(),
      }),
    ).toEqual([]);
  });
});
