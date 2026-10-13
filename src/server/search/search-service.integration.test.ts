import { beforeAll, describe, expect, inject, it } from "vitest";

import {
  idb as db,
  randBoss,
  seedUser,
} from "@/server/api/integration-test-helpers";
import {
  DEFAULT_UNIVERSITY_ABBRV,
  searchCourses,
  searchProfessors,
} from "./search-service";
import catalog from "./fixtures/catalog.json";
import rankingCases from "./fixtures/ranking.cases.json";

describe("search-service integration", () => {
  const smuUniversityId = inject("universityId");
  const smuFacultyId = inject("facultyId");
  const acadTermId = inject("acadTermId");

  beforeAll(async () => {
    // Upsert NUS university and faculty for multi-university tests
    const nusUni = await db.universities.upsert({
      where: { abbrv: "NUS" },
      update: {},
      create: {
        name: "National University of Singapore",
        abbrv: "NUS",
        siteUrl: "https://nus.edu.sg",
      },
    });

    const nusFaculty = await db.faculties.upsert({
      where: {
        belongToUniversityId_acronym: {
          belongToUniversityId: nusUni.id,
          acronym: "FASS",
        },
      },
      update: {},
      create: {
        name: "Faculty of Arts and Social Sciences",
        acronym: "FASS",
        siteUrl: "https://fass.nus.edu.sg",
        belongToUniversityId: nusUni.id,
      },
    });

    const reviewer = await seedUser(db);

    // Upsert professors from catalog fixture
    for (const p of catalog.professors) {
      const uniId = p.universityAbbrv === "NUS" ? nusUni.id : smuUniversityId;
      await db.professors.upsert({
        where: { slug: p.slug },
        update: {
          name: p.name,
          bossAliases: p.bossAliases,
          belongToUniversityId: uniId,
        },
        create: {
          name: p.name,
          slug: p.slug,
          email: `${p.slug}@example.edu`,
          photoUrl: `https://example.edu/${p.slug}.jpg`,
          profileUrl: `https://example.edu/${p.slug}`,
          bossAliases: p.bossAliases,
          belongToUniversityId: uniId,
        },
      });
    }

    // Upsert courses from catalog fixture
    for (const c of catalog.courses) {
      const uniId = c.universityAbbrv === "NUS" ? nusUni.id : smuUniversityId;
      const facId = c.universityAbbrv === "NUS" ? nusFaculty.id : smuFacultyId;
      await db.courses.upsert({
        where: { code: c.code },
        update: {
          name: c.name,
          description: c.description,
          creditUnits: c.creditUnits,
          belongToUniversityId: uniId,
          belongToFacultyId: facId,
        },
        create: {
          code: c.code,
          name: c.name,
          description: c.description,
          creditUnits: c.creditUnits,
          belongToUniversityId: uniId,
          belongToFacultyId: facId,
        },
      });
    }

    // Upsert classes from catalog fixture
    for (const cls of catalog.classes) {
      const course = await db.courses.findUnique({
        where: { code: cls.courseCode },
      });
      const prof = await db.professors.findUnique({
        where: { slug: cls.professorSlug },
      });
      if (course && prof) {
        const existingClass = await db.classes.findFirst({
          where: {
            courseId: course.id,
            section: cls.section,
            acadTermId,
            professorId: prof.id,
          },
        });
        if (!existingClass) {
          await db.classes.create({
            data: {
              courseId: course.id,
              professorId: prof.id,
              acadTermId,
              section: cls.section,
              bossId: randBoss(),
            },
          });
        }
      }
    }

    // Clean up existing reviews for the fixture courses to ensure determinism
    const courseCodes = catalog.courses.map((c) => c.code);
    const fixtureCourses = await db.courses.findMany({
      where: { code: { in: courseCodes } },
      select: { id: true },
    });
    if (fixtureCourses.length > 0) {
      await db.reviews.deleteMany({
        where: { reviewedCourseId: { in: fixtureCourses.map((c) => c.id) } },
      });
    }

    // Insert reviews from catalog fixture
    for (const rev of catalog.reviews) {
      const course = await db.courses.findUnique({
        where: { code: rev.courseCode },
      });
      const prof = rev.professorSlug
        ? await db.professors.findUnique({ where: { slug: rev.professorSlug } })
        : null;
      if (course) {
        await db.reviews.create({
          data: {
            body: rev.body,
            rating: 5,
            reviewedCourseId: course.id,
            reviewedUniversityId: course.belongToUniversityId,
            reviewedFacultyId: course.belongToFacultyId,
            reviewerId: reviewer.id,
            reviewedProfessorId: prof?.id ?? null,
          },
        });
      }
    }
  });

  it("runs every operator input from the 2.2 vector table without database errors", async () => {
    const operatorInputs = [
      "statistics",
      "intro to computing",
      "C++",
      "A&F",
      "(IS216)",
      "!crab | fish",
      "a:b*",
      "O'Brien",
      "back\\slash",
      "COR-STAT1202",
      "ACCT102",
      "René Müller",
      "日本語",
      "; SELECT * FROM courses;--",
      "&&& (( ::",
      "a b c d e f g h i j",
    ];

    for (const input of operatorInputs) {
      await expect(
        searchCourses(db, { query: input, limit: 10 }),
      ).resolves.toBeDefined();
      await expect(
        searchProfessors(db, { query: input, limit: 10 }),
      ).resolves.toBeDefined();
    }
  });

  it("returns COR-STAT1202 first for all code variants (COR STAT1202, COR STAT 1202, COR-STAT1202, CORSTAT1202)", async () => {
    const variants = [
      "COR STAT1202",
      "COR STAT 1202",
      "COR-STAT1202",
      "CORSTAT1202",
    ];
    for (const variant of variants) {
      const res = await searchCourses(db, { query: variant, limit: 10 });
      expect(res.rows[0]?.code).toBe("COR-STAT1202");
    }
  });

  it("returns ACCT102 for 'ACCT 102'", async () => {
    const res = await searchCourses(db, { query: "ACCT 102", limit: 10 });
    expect(res.rows[0]?.code).toBe("ACCT102");
  });

  it("returns COR-STAT1202 for 'STAT1202'", async () => {
    const res = await searchCourses(db, { query: "STAT1202", limit: 10 });
    expect(res.rows.some((r) => r.code === "COR-STAT1202")).toBe(true);
  });

  it("returns IS216 for 'IS'", async () => {
    const res = await searchCourses(db, { query: "IS", limit: 10 });
    expect(res.rows.some((r) => r.code === "IS216")).toBe(true);
  });

  it("returns a course whose name starts with 'Data Structures' for 'dat stru'", async () => {
    const res = await searchCourses(db, { query: "dat stru", limit: 10 });
    expect(res.rows.some((r) => r.name.startsWith("Data Structures"))).toBe(
      true,
    );
  });

  it("returns Goh, Jing Rong for 'Jing Goh'", async () => {
    const res = await searchProfessors(db, { query: "Jing Goh", limit: 10 });
    expect(res.rows.some((r) => r.name === "Goh, Jing Rong")).toBe(true);
  });

  it("returns Goh, Jing Rong for 'Goh, Jing Rong'", async () => {
    const res = await searchProfessors(db, {
      query: "Goh, Jing Rong",
      limit: 10,
    });
    expect(res.rows.some((r) => r.name === "Goh, Jing Rong")).toBe(true);
  });

  it("returns no row lacking a literal '100%' for query '100%'", async () => {
    const res = await searchCourses(db, { query: "100%", limit: 10 });
    expect(res.rows.length).toBeGreaterThan(0);
    for (const row of res.rows) {
      expect(row.code.includes("100%") || row.name.includes("100%")).toBe(true);
    }
  });

  it("ranks exact code row first and prefix row second in SQL order", async () => {
    const rows = await db.$queryRaw<{ code: string }[]>`
      SELECT c.code
      FROM courses c
      WHERE c.code IN ('MATH101', 'MATH101A')
      ORDER BY
        (c.code = UPPER(${"MATH101"}) OR REPLACE(c.code, '-', '') = ${"MATH101"})::int DESC,
        (c.code ILIKE (${"MATH101"} || '%'))::int DESC,
        similarity(c.name, ${"MATH101"}) DESC,
        c.code;
    `;
    expect(rows[0]?.code).toBe("MATH101");
    expect(rows[1]?.code).toBe("MATH101A");

    // Exact-code short circuit in service returns only MATH101
    const serviceRes = await searchCourses(db, { query: "MATH101", limit: 10 });
    expect(serviceRes.rows.map((r) => r.code)).toEqual(["MATH101"]);
    expect(serviceRes.total).toBe(1);
  });

  it("sets total to the number of matches when limit is 1 and 3 rows match", async () => {
    const res = await searchCourses(db, { query: "Statistical", limit: 1 });
    expect(res.rows).toHaveLength(1);
    expect(res.total).toBe(3);
  });

  it("supports future expansion: returns SMU and NUS when universityAbbrv is omitted, only SMU when DEFAULT_UNIVERSITY_ABBRV is passed", async () => {
    const both = await searchCourses(db, {
      query: "Introductory Economics",
      limit: 10,
    });
    const smuHit = both.rows.find((r) => r.code === "ECON101");
    const nusHit = both.rows.find((r) => r.code === "EC1101E");
    expect(smuHit).toBeDefined();
    expect(nusHit).toBeDefined();
    expect(smuHit?.uniAbbrv).toBe("SMU");
    expect(nusHit?.uniAbbrv).toBe("NUS");

    const smuOnly = await searchCourses(db, {
      query: "Introductory Economics",
      limit: 10,
      universityAbbrv: DEFAULT_UNIVERSITY_ABBRV,
    });
    expect(smuOnly.rows.some((r) => r.code === "ECON101")).toBe(true);
    expect(smuOnly.rows.some((r) => r.code === "EC1101E")).toBe(false);
  });

  it("roadmap path (no acadTermId) returns no course through professor name branch, timetable path returns the course", async () => {
    const roadmapRes = await searchCourses(db, {
      query: "Goh, Jing Rong",
      limit: 10,
    });
    expect(roadmapRes.rows.some((r) => r.code === "IS216")).toBe(false);

    const timetableRes = await searchCourses(db, {
      query: "Goh, Jing Rong",
      limit: 10,
      acadTermId,
    });
    expect(timetableRes.rows.some((r) => r.code === "IS216")).toBe(true);
  });

  it("narrows by scope: professorSlug returns only courses taught by that professor, courseCode returns only professors teaching that course", async () => {
    const profCourses = await searchCourses(db, {
      query: "",
      limit: 10,
      scope: { professorSlug: "goh-jing-rong" },
    });
    expect(profCourses.rows.length).toBeGreaterThan(0);
    expect(
      profCourses.rows.every((r) => r.code === "IS216" || r.code === "ECON101"),
    ).toBe(true);

    const courseProfs = await searchProfessors(db, {
      query: "",
      limit: 10,
      scope: { courseCode: "IS216" },
    });
    expect(courseProfs.rows.length).toBeGreaterThan(0);
    expect(courseProfs.rows.every((r) => r.slug === "goh-jing-rong")).toBe(
      true,
    );
  });

  it("withCounts: true returns the same profCount, courseCount and reviewCount as existing count queries", async () => {
    // Course parity
    const is216Res = await searchCourses(db, {
      query: "IS216",
      limit: 10,
      withCounts: true,
    });
    const is216Hit = is216Res.rows[0]!;
    expect(is216Hit).toBeDefined();

    const expectedProfCount = await db.professors.count({
      where: { classes: { some: { course: { code: "IS216" } } } },
    });
    expect(is216Hit.profCount).toBe(expectedProfCount);

    // Professor parity
    const gohRes = await searchProfessors(db, {
      query: "Goh, Jing Rong",
      limit: 10,
      withCounts: true,
    });
    const gohHit = gohRes.rows[0]!;
    expect(gohHit).toBeDefined();

    const expectedCourseCount = await db.courses.count({
      where: { classes: { some: { professor: { slug: "goh-jing-rong" } } } },
    });
    expect(gohHit.courseCount).toBe(expectedCourseCount);

    const expectedProfReviewCount = await db.reviews.count({
      where: { reviewedProfessor: { slug: "goh-jing-rong" } },
    });
    expect(gohHit.reviewCount).toBe(expectedProfReviewCount);

    // Review parity for course
    const is216ReviewCount = await db.reviews.count({
      where: { reviewedCourse: { code: "IS216" } },
    });
    expect(is216Hit.reviewCount).toBe(is216ReviewCount);

    // Course-only review check for ACCT102
    const acctRes = await searchCourses(db, {
      query: "ACCT102",
      limit: 10,
      withCounts: true,
    });
    const acctHit = acctRes.rows[0]!;
    expect(acctHit.reviewCount).toBe(1);
  });

  it.each(rankingCases.cases)(
    "ranks the fixed catalog as the golden order: $name",
    async ({ query, expectedCodes }) => {
      const catalogCodes = new Set(catalog.courses.map((c) => c.code));
      const res = await searchCourses(db, { query, limit: 50 });
      const codes = res.rows
        .map((r) => r.code)
        .filter((c) => catalogCodes.has(c));
      expect(codes).toEqual(expectedCodes);
    },
  );
});
