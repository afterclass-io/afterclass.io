import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";

// Search counts only run for an authenticated caller; the old procedures and
// the folded SQL must produce identical numbers.
const authMock = vi.hoisted(() => vi.fn());
vi.mock("@/server/auth", () => ({ auth: authMock }));

// `searchCourse`/`searchProf` read the app's pooled client; point it at the
// per-file Testcontainers client the helpers seed through.
vi.mock("@/server/db", async () => {
  const { idb } = await import("@/server/api/integration-test-helpers");
  return { db: idb };
});

import {
  idb as db,
  randBoss,
  seedAcadTerm,
  seedCourse,
  seedProfessor,
  seedUser,
} from "@/server/api/integration-test-helpers";

import { searchCourse } from "./searchCourse";
import { searchProf } from "./searchProf";

const session = { user: { id: "search-integration-user" } };

let code: string;
let slug: string;
const profName = "Searchable Integration Professor";

beforeAll(async () => {
  authMock.mockResolvedValue(session);

  const suffix = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  code = `SRCH${suffix}`;
  slug = `search-prof-${suffix.toLowerCase()}`;

  const term = await seedAcadTerm(db);
  const course = await seedCourse(db, {
    code,
    name: "Search Integration Course",
  });
  const professor = await seedProfessor(db, { slug, name: profName });
  const reviewer = await seedUser(db);

  // Two sections of the same course: the replaced Prisma `some` count and the
  // folded COUNT(DISTINCT) must both report exactly one professor.
  await db.classes.createMany({
    data: [
      {
        section: "G1",
        courseId: course.id,
        professorId: professor.id,
        acadTermId: term.id,
        bossId: randBoss(),
      },
      {
        section: "G2",
        courseId: course.id,
        professorId: professor.id,
        acadTermId: term.id,
        bossId: randBoss(),
      },
    ],
  });

  await db.reviews.create({
    data: {
      body: "a".repeat(200),
      rating: 4,
      reviewerId: reviewer.id,
      reviewedCourseId: course.id,
      reviewedUniversityId: course.belongToUniversityId,
      reviewedFacultyId: course.belongToFacultyId,
      reviewedProfessorId: professor.id,
    },
  });
});

describe("search count folding", () => {
  it("course counts match the relations they replaced", async () => {
    const row = (await searchCourse(code)).find((r) => r.courseCode === code);
    expect(row).toBeDefined();

    const expectedProfCount = await db.professors.count({
      where: { classes: { some: { course: { code } } } },
    });
    const expectedReviewCount = await db.reviews.count({
      where: { reviewedCourse: { code } },
    });

    expect(row?.profCount).toBe(expectedProfCount);
    expect(row?.profCount).toBe(1);
    expect(row?.reviewCount).toBe(expectedReviewCount);
    expect(row?.reviewCount).toBe(1);
  });

  it("counts a course with no professor relation as zero", async () => {
    const suffix = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const lonelyCode = `LONE${suffix}`;
    await seedCourse(db, { code: lonelyCode, name: "Lonely Course" });

    const row = (await searchCourse(lonelyCode)).find(
      (r) => r.courseCode === lonelyCode,
    );

    expect(row?.profCount).toBe(0);
    expect(row?.reviewCount).toBe(0);
  });

  it("professor counts match the relations they replaced", async () => {
    const row = (await searchProf("Searchable")).find(
      (r) => r.profSlug === slug,
    );
    expect(row).toBeDefined();

    const expectedCourseCount = await db.courses.count({
      where: { classes: { some: { professor: { slug } } } },
    });
    const expectedReviewCount = await db.reviews.count({
      where: { reviewedProfessor: { slug } },
    });

    expect(row?.courseCount).toBe(expectedCourseCount);
    expect(row?.courseCount).toBe(1);
    expect(row?.reviewCount).toBe(expectedReviewCount);
    expect(row?.reviewCount).toBe(1);
  });

  it("returns zero counts for anonymous callers", async () => {
    authMock.mockResolvedValueOnce(null);

    const row = (await searchCourse(code)).find((r) => r.courseCode === code);

    expect(row?.profCount).toBe(0);
    expect(row?.reviewCount).toBe(0);
  });
});
