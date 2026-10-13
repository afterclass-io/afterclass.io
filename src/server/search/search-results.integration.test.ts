import { beforeAll, describe, expect, inject, it } from "vitest";
import {
  idb as db,
  randBoss,
  seedUser,
} from "@/server/api/integration-test-helpers";
import { searchCourseResults, searchProfessorResults } from "./search-service";
import catalog from "./fixtures/results.json";

describe("search results pages", () => {
  beforeAll(async () => {
    await db.courses.createMany({
      data: catalog.courses.map((course) => ({
        ...course,
        creditUnits: 1,
        belongToUniversityId: inject("universityId"),
        belongToFacultyId: inject("facultyId"),
      })),
    });
    await db.professors.createMany({
      data: catalog.professors.map((p) => ({
        ...p,
        email: `${p.slug}@example.edu`,
        photoUrl: "https://example.edu/photo.jpg",
        profileUrl: "https://example.edu/profile",
        belongToUniversityId: inject("universityId"),
      })),
    });
    const university = await db.universities.upsert({
      where: { abbrv: "NTU" },
      update: {},
      create: {
        name: "Nanyang Technological University",
        abbrv: "NTU",
        siteUrl: "https://www.ntu.edu.sg",
      },
    });
    const faculty = await db.faculties.upsert({
      where: {
        belongToUniversityId_acronym: {
          belongToUniversityId: university.id,
          acronym: "RESULTS",
        },
      },
      update: {},
      create: {
        name: "Results fixture faculty",
        acronym: "RESULTS",
        siteUrl: "https://www.ntu.edu.sg",
        belongToUniversityId: university.id,
      },
    });
    await db.courses.create({
      data: {
        ...catalog.courses[0]!,
        code: "RESULT-FOREIGN",
        creditUnits: 1,
        belongToUniversityId: university.id,
        belongToFacultyId: faculty.id,
      },
    });
    const course = await db.courses.findUniqueOrThrow({
      where: { code: catalog.courses[0]!.code },
    });
    const professor = await db.professors.findUniqueOrThrow({
      where: { slug: catalog.professors[0]!.slug },
    });
    await db.classes.create({
      data: {
        bossId: randBoss(),
        section: "G1",
        acadTermId: inject("acadTermId"),
        courseId: course.id,
        professorId: professor.id,
      },
    });
    const user = await seedUser(db);
    await db.reviews.create({
      data: {
        body: "Canonical results fixture review",
        rating: 5,
        reviewedCourseId: course.id,
        reviewedProfessorId: professor.id,
        reviewedUniversityId: inject("universityId"),
        reviewedFacultyId: inject("facultyId"),
        reviewerId: user.id,
      },
    });
  });

  it("makes every name substring reachable with disjoint related results and accurate empty-page totals", async () => {
    const expected = catalog.courses
      .filter((c) => /singapore/i.test(c.name))
      .map((c) => c.code);
    const first = await searchCourseResults(db, {
      query: "Singapore",
      group: "matches",
      limit: 20,
    });
    const last = await searchCourseResults(db, {
      query: "Singapore",
      group: "matches",
      limit: 20,
      cursor: first.nextCursor!,
    });
    const codes = [...first.rows, ...last.rows].map((c) => c.code);
    expect(first.rows).toHaveLength(20);
    expect(codes).toEqual(expect.arrayContaining(expected));
    expect(codes).not.toContain("RESULT-FOREIGN");
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.length).toBe(first.totals.matches);
    expect(last.totals).toEqual(first.totals);
    expect(last.nextCursor).toBeNull();
    const related = await searchCourseResults(db, {
      query: "Singapore",
      group: "related",
      limit: 50,
    });
    expect(related.rows.map((c) => c.code)).toContain("RESULT-FUZZY");
    expect(related.rows.every((c) => !codes.includes(c.code))).toBe(true);
    const empty = await searchCourseResults(db, {
      query: "Singapore",
      group: "matches",
      limit: 20,
      cursor: 10000,
    });
    expect(empty.rows).toEqual([]);
    expect(empty.totals).toEqual(first.totals);
    expect(empty.nextCursor).toBeNull();
  });

  it("ranks literal names before metadata and keeps partial-name matches", async () => {
    const result = await searchCourseResults(db, {
      query: "Singapore",
      group: "matches",
      limit: 50,
    });
    const codes = result.rows.map((c) => c.code);
    expect(codes).toContain("RESULT-SUBSTRING");
    expect(codes.indexOf("RESULT-SUBSTRING")).toBeLessThan(
      codes.indexOf("RESULT-DESCRIPTION"),
    );
    expect(codes.indexOf("RESULT-SUBSTRING")).toBeLessThan(
      codes.indexOf("RESULT-AREA"),
    );
  });

  it("keeps code siblings reachable while ranking normalized exact codes first", async () => {
    for (const query of ["RESULT CODE100", "RESULT-CODE100"]) {
      const result = await searchCourseResults(db, {
        query,
        group: "matches",
        limit: 20,
      });
      expect(result.rows.map((c) => c.code).slice(0, 2)).toEqual([
        "RESULT-CODE100",
        "RESULT-CODE100A",
      ]);
      expect(result.totals.matches).toBeGreaterThanOrEqual(2);
    }
  });

  it("paginates professors and classifies aliases, slugs and fuzzy names", async () => {
    const first = await searchProfessorResults(db, {
      query: "Singapore",
      group: "matches",
      limit: 20,
    });
    const last = await searchProfessorResults(db, {
      query: "Singapore",
      group: "matches",
      limit: 20,
      cursor: first.nextCursor!,
    });
    const rows = [...first.rows, ...last.rows];
    expect(first.rows).toHaveLength(20);
    expect(rows[0]!.name).toBe("Singapore");
    expect(rows.some((p) => p.slug === "results-alias")).toBe(true);
    expect(rows.some((p) => p.slug === "results-singapore-slug")).toBe(true);
    expect(new Set(rows.map((p) => p.id)).size).toBe(first.totals.matches);
    expect(last.nextCursor).toBeNull();
    const related = await searchProfessorResults(db, {
      query: "Singapore",
      group: "related",
      limit: 50,
    });
    expect(related.rows.map((p) => p.slug)).toContain("results-fuzzy");
    expect(related.rows.every((p) => !rows.some((r) => r.id === p.id))).toBe(
      true,
    );
    const empty = await searchProfessorResults(db, {
      query: "Singapore",
      group: "matches",
      cursor: 10000,
      limit: 20,
    });
    expect(empty.totals).toEqual(first.totals);
    expect(empty.rows).toEqual([]);
  });

  it("returns no results for short or punctuation-only queries", async () => {
    for (const query of ["a", "&&&"]) {
      expect(
        await searchCourseResults(db, { query, group: "matches", limit: 20 }),
      ).toEqual({
        rows: [],
        totals: { matches: 0, related: 0 },
        nextCursor: null,
      });
    }
  });

  it("counts statistics only when requested and executes one SQL statement per page", async () => {
    const statements: string[] = [];
    db.$on("query", (event) => statements.push(event.query));
    for (const withCounts of [false, true]) {
      statements.length = 0;
      const courses = await searchCourseResults(db, {
        query: catalog.courses[0]!.code,
        group: "matches",
        limit: 20,
        withCounts,
      });
      expect(statements).toHaveLength(1);
      expect(courses.rows[0]).toMatchObject({
        profCount: Number(withCounts),
        reviewCount: Number(withCounts),
      });
      statements.length = 0;
      const professors = await searchProfessorResults(db, {
        query: "Singapore",
        group: "matches",
        limit: 20,
        withCounts,
      });
      expect(statements).toHaveLength(1);
      expect(professors.rows[0]).toMatchObject({
        courseCount: Number(withCounts),
        reviewCount: Number(withCounts),
      });
    }
  });

  it("retains fuzzy professors when their nullable database alias array is absent", async () => {
    await db.$executeRaw`UPDATE professors SET boss_aliases = NULL WHERE slug = ${"results-fuzzy"}`;
    const related = await searchProfessorResults(db, {
      query: "Singapore",
      group: "related",
      limit: 50,
    });
    expect(related.rows.map((p) => p.slug)).toContain("results-fuzzy");
  });
});
