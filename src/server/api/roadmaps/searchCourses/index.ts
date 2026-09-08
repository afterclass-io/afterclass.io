import { z } from "zod";

import { normalizeSearchQuery } from "@/common/tools/query-normalize";
import { publicProcedure } from "@/server/api/trpc";

import {
  buildCourseSearchQuery,
  searchCoursesShared,
} from "@/server/api/timetable/searchCourses/query";

export const searchCourses = publicProcedure
  .input(z.object({ query: z.string().min(1).max(200) }))
  .query(async ({ ctx, input }) => {
    const q = normalizeSearchQuery(input.query);
    // Min-length guard mirrors the timetable procedure: sub-2-char queries
    // are too generic to be useful. Return early, before SQL.
    if (q.length < 2) return [];

    // Whole-catalog search through the SAME ranked SQL as the timetable
    // procedure (no forked ranking). No acadTermId, so the offered-in-term
    // and professor-term gates are skipped. Same output shape
    // ({ id, code, name, creditUnits }) so the roadmap planner UI contract
    // is preserved.
    return searchCoursesShared(
      ctx.db,
      buildCourseSearchQuery({
        hasTimingFilter: false,
        timing: { day: null, startsAfter: null, endsBefore: null },
        q,
      }),
    );
  });
