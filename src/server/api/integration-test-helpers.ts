import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { afterAll, inject } from "vitest";

// One Prisma client per integration test file, pointed at the Testcontainers
// Postgres started in vitest.integration.setup.ts. Vitest isolates module state
// per file, so this module (and the afterAll below) evaluates once per file.
export const idb = new PrismaClient({
  adapter: new PrismaPg({ connectionString: inject("dbUrl") }),
});
afterAll(() => idb.$disconnect());

// `bossId` is a plain unique int with no FK — a random one keeps parallel test
// files from colliding on it.
export const randBoss = () => Math.floor(Math.random() * 1_000_000_000);

type Db = PrismaClient;
const universityId = () => inject("universityId");
const facultyId = () => inject("facultyId");

/** A user in the seeded university. `email`/`username` default to unique values. */
export function seedUser(
  db: Db,
  over: { email?: string; username?: string } = {},
) {
  const s = randomUUID();
  return db.users.create({
    data: {
      email: over.email ?? `u-${s}@example.edu`,
      username: over.username ?? `u-${s}`,
      universityId: universityId(),
    },
  });
}

/** A course in the seeded university/faculty. `code` defaults to a unique value. */
export function seedCourse(
  db: Db,
  over: { code?: string; name?: string; creditUnits?: number } = {},
) {
  const s = randomUUID();
  return db.courses.create({
    data: {
      code: over.code ?? `C${s.slice(0, 8)}`,
      name: over.name ?? "Test Course",
      description: "seed",
      creditUnits: over.creditUnits ?? 1,
      belongToUniversityId: universityId(),
      belongToFacultyId: facultyId(),
    },
  });
}

/** A professor in the seeded university. `slug`/`email` default to unique values. */
export function seedProfessor(
  db: Db,
  over: { name?: string; slug?: string; email?: string } = {},
) {
  const slug = over.slug ?? `prof-${randomUUID()}`;
  return db.professors.create({
    data: {
      name: over.name ?? "Test Professor",
      email: over.email ?? `${slug}@example.edu`,
      slug,
      photoUrl: "https://example.edu/p.jpg",
      profileUrl: "https://example.edu/p",
      belongToUniversityId: universityId(),
    },
  });
}

/**
 * An acad term. `id` defaults to a unique value; `acadYearEnd` and the term
 * dates derive from `acadYearStart` (default 2024) unless given explicitly.
 */
export function seedAcadTerm(
  db: Db,
  over: {
    id?: string;
    acadYearStart?: number;
    acadYearEnd?: number;
    term?: string;
    startDt?: Date;
    endDt?: Date;
  } = {},
) {
  const acadYearStart = over.acadYearStart ?? 2024;
  return db.acadTerm.create({
    data: {
      id: over.id ?? `AY-${randomUUID().slice(0, 8)}`,
      acadYearStart,
      acadYearEnd: over.acadYearEnd ?? acadYearStart + 1,
      term: over.term ?? "1",
      bossId: randBoss(),
      startDt: over.startDt ?? new Date(`${acadYearStart}-08-01`),
      endDt: over.endDt ?? new Date(`${acadYearStart}-12-01`),
    },
  });
}
