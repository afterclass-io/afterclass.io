import { z } from "zod";

import { UniversityAbbreviation } from "@/generated/prisma/enums";
import { MAX_QUERY_LEN } from "@/common/tools/query-normalize";
import { publicProcedure } from "@/server/api/trpc";
import {
  DEFAULT_UNIVERSITY_ABBRV,
  searchProfessors,
} from "@/server/search/search-service";

export const professors = publicProcedure
  .input(
    z.object({
      query: z.string().max(MAX_QUERY_LEN),
      scope: z.object({ courseCode: z.string().min(1).max(32) }).optional(),
      limit: z.number().int().min(1).max(50).default(10),
      universityAbbrv: z
        .enum(UniversityAbbreviation)
        .default(DEFAULT_UNIVERSITY_ABBRV),
    }),
  )
  .query(async ({ ctx, input }) => {
    const { rows, total } = await searchProfessors(ctx.db, input);
    return {
      rows: rows.map(({ id, slug, name }) => ({ id, slug, name })),
      total,
    };
  });
