import { beforeAll, describe, expect, inject, it } from "vitest";

import {
  idb as db,
  randBoss,
  seedAcadTerm,
  seedCourse,
  seedProfessor,
} from "@/server/api/integration-test-helpers";
import { searchCourses, searchCoursesByTerms } from "./search-service";

// Parity: `searchCoursesByTerms` must return, for every term, the rows that
// `searchCourses` returns for that term alone. A single `LIMIT 20` over all
// terms would not, so the fixture is larger than the cap.

const PER_TERM = 20;
const COURSE_COUNT = 26;
const code = (n: number) => `QKA${String(n).padStart(3, "0")}`;

describe("searchCoursesByTerms parity with one search per term", () => {
  const facultyId = inject("facultyId");
  let termA = "";
  let termB = "";
  let termC = "";

  beforeAll(async () => {
    // Keep the default academic year (2024): bid history queries take their
    // cutoff from the latest year in the shared database, so a later year
    // here would hide other files' fixtures.
    const [a, b, c] = await Promise.all([
      seedAcadTerm(db, { term: "1" }),
      seedAcadTerm(db, { term: "2" }),
      seedAcadTerm(db, { term: "3A" }),
    ]);
    termA = a.id;
    termB = b.id;
    termC = c.id;
    const professor = await seedProfessor(db);

    // Name length varies, so name similarity ranks the courses; equal-length
    // names fall back to code order.
    const courses = [];
    for (let n = 1; n <= COURSE_COUNT; n++) {
      courses.push(
        await seedCourse(db, {
          code: code(n),
          name: `Quokka Seminar ${"Studies ".repeat(Math.ceil(n / 3))}`.trim(),
        }),
      );
    }

    // Term A: every course (26 > cap). Term B: courses 5 to 26 (22 > cap).
    // Term C: a handful, below the cap.
    const offered = new Map<string, number[]>([
      [termA, Array.from({ length: COURSE_COUNT }, (_, i) => i + 1)],
      [termB, Array.from({ length: 22 }, (_, i) => i + 5)],
      [termC, [1, 2, 3, 24, 25, 26]],
    ]);
    for (const [acadTermId, numbers] of offered) {
      for (const n of numbers) {
        await db.classes.create({
          data: {
            courseId: courses[n - 1]!.id,
            professorId: professor.id,
            acadTermId,
            section: "G1",
            bossId: randBoss(),
          },
        });
      }
    }
  });

  it.each(["quokka seminar", "QKA005", "QKA0", "studies"])(
    "returns the same rows per term as one search per term for query %s",
    async (query) => {
      const terms = [termA, termB, termC];

      const perTerm = [];
      for (const acadTermId of terms) {
        const { rows } = await searchCourses(db, {
          query,
          limit: PER_TERM,
          acadTermId,
        });
        perTerm.push({ acadTermId, rows });
      }

      const batched = await searchCoursesByTerms(db, {
        query,
        limitPerTerm: PER_TERM,
        acadTermIds: terms,
      });

      expect(batched).toEqual(perTerm);
    },
  );

  it("keeps the top 20 of each term, not the top 20 overall", async () => {
    const batched = await searchCoursesByTerms(db, {
      query: "quokka seminar",
      limitPerTerm: PER_TERM,
      acadTermIds: [termA, termB, termC],
    });

    const sizes = batched.map((t) => t.rows.length);
    expect(sizes).toEqual([PER_TERM, PER_TERM, 6]);
    // A single LIMIT 20 over all terms would return 20 rows in total.
    expect(sizes.reduce((sum, n) => sum + n, 0)).toBeGreaterThan(PER_TERM);
    // Term B holds no course that is only offered in term A.
    const termBCodes = new Set(batched[1]!.rows.map((r) => r.code));
    expect(termBCodes.has(code(1))).toBe(false);
  });

  it("returns empty rows for a term without matches and for another faculty", async () => {
    const other = await searchCoursesByTerms(db, {
      query: "quokka seminar",
      limitPerTerm: PER_TERM,
      acadTermIds: [termA],
      facultyId: facultyId + 1_000_000,
    });
    expect(other).toEqual([{ acadTermId: termA, rows: [] }]);

    const none = await searchCoursesByTerms(db, {
      query: "quokka seminar",
      limitPerTerm: PER_TERM,
      acadTermIds: ["no-such-term"],
    });
    expect(none).toEqual([{ acadTermId: "no-such-term", rows: [] }]);
  });
});
