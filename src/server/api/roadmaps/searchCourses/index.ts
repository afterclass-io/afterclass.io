import { z } from "zod";

import { dataProcedure } from "@/server/api/trpc";
import * as searchService from "@/server/search/search-service";

export const searchCourses = dataProcedure("courses")
  .input(z.object({ query: z.string().min(1).max(200) }))
  .query(async ({ ctx, input }) => {
    const { rows } = await searchService.searchCourses(ctx.db, {
      query: input.query,
      limit: 20,
    });
    return rows.map(({ id, code, name, creditUnits }) => ({
      id,
      code,
      name,
      creditUnits,
    }));
  });
