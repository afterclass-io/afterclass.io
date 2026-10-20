import { z } from "zod";

import { dataProcedure } from "@/server/api/trpc";
import { searchProfessors } from "@/server/search/search-service";

export const search = dataProcedure("professors")
  .input(
    z.object({
      query: z.string().min(1).max(200),
      limit: z.number().int().min(1).max(50).default(10),
    }),
  )
  .query(async ({ ctx, input }) => {
    const { rows, total } = await searchProfessors(ctx.db, {
      query: input.query,
      limit: input.limit,
    });
    return {
      rows: rows.map(({ id, slug, name }) => ({ id, slug, name })),
      count: total,
    };
  });
