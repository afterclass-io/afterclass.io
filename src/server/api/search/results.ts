import { z } from "zod";
import { MAX_QUERY_LEN } from "@/common/tools/query-normalize";
import { publicProcedure } from "@/server/api/trpc";
import {
  searchCourseResults,
  searchProfessorResults,
} from "@/server/search/search-service";

const input = z.object({
  query: z.string().max(MAX_QUERY_LEN),
  group: z.enum(["matches", "related"]),
  cursor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const courseResults = publicProcedure
  .input(input)
  .query(({ ctx, input }) =>
    searchCourseResults(ctx.db, { ...input, withCounts: Boolean(ctx.session) }),
  );

export const professorResults = publicProcedure
  .input(input)
  .query(({ ctx, input }) =>
    searchProfessorResults(ctx.db, {
      ...input,
      withCounts: Boolean(ctx.session),
    }),
  );
