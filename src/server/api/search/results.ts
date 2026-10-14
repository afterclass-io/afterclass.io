import { z } from "zod";
import { MAX_QUERY_LEN } from "@/common/tools/query-normalize";
import { publicProcedure } from "@/server/api/trpc";
import {
  DEFAULT_UNIVERSITY_ABBRV,
  searchCourses,
  searchProfessors,
} from "@/server/search/search-service";

const input = z.object({
  query: z.string().max(MAX_QUERY_LEN),
  cursor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
  limit: z.number().int().min(1).max(50).default(20),
});

export const courseResults = publicProcedure
  .input(input)
  .query(async ({ ctx, input }) => {
    const { rows, total } = await searchCourses(ctx.db, {
      ...input,
      universityAbbrv: DEFAULT_UNIVERSITY_ABBRV,
      withCounts: Boolean(ctx.session),
    });
    return {
      rows: rows.map((row) => ({
        uniAbbrv: row.uniAbbrv,
        courseCode: row.code,
        courseName: row.name,
        profCount: row.profCount,
        reviewCount: row.reviewCount,
      })),
      total,
      nextCursor:
        rows.length > 0 && input.cursor + rows.length < total
          ? input.cursor + rows.length
          : null,
    };
  });

export const professorResults = publicProcedure
  .input(input)
  .query(async ({ ctx, input }) => {
    const { rows, total } = await searchProfessors(ctx.db, {
      ...input,
      universityAbbrv: DEFAULT_UNIVERSITY_ABBRV,
      withCounts: Boolean(ctx.session),
    });
    return {
      rows: rows.map((row) => ({
        uniAbbrv: row.uniAbbrv,
        profName: row.name,
        profSlug: row.slug,
        courseCount: row.courseCount,
        reviewCount: row.reviewCount,
      })),
      total,
      nextCursor:
        rows.length > 0 && input.cursor + rows.length < total
          ? input.cursor + rows.length
          : null,
    };
  });
