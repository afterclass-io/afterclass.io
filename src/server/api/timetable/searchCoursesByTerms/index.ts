import { z } from "zod";

import { dataProcedure } from "@/server/api/trpc";
import * as searchService from "@/server/search/search-service";

/** Per-term row cap, equal to the cap of `timetable.searchCourses`. */
const COURSES_PER_TERM = 20;
const MAX_TERMS = 5;

/**
 * Catalog search across several terms in one round trip. Each term returns
 * its own top 20, ranked as `timetable.searchCourses` ranks a single term,
 * so a caller that looped over `searchCourses` gets the same rows per term.
 */
export const searchCoursesByTerms = dataProcedure("classData")
  .input(
    z.object({
      acadTermIds: z.array(z.string()).min(1).max(MAX_TERMS),
      query: z.string().min(1).max(200),
      facultyId: z.number().int().optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const terms = await searchService.searchCoursesByTerms(ctx.db, {
      query: input.query,
      limitPerTerm: COURSES_PER_TERM,
      acadTermIds: input.acadTermIds,
      facultyId: input.facultyId,
    });

    return terms.map(({ acadTermId, rows }) => ({
      acadTermId,
      courses: rows.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        creditUnits: c.creditUnits,
      })),
    }));
  });
