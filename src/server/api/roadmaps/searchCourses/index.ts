import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";

type SearchRow = {
  id: string;
  code: string;
  name: string;
  creditUnits: number;
};

export const searchCourses = publicProcedure
  .input(z.object({ query: z.string().min(1) }))
  .query(async ({ ctx, input }) => {
    const q = input.query.trim();
    if (!q) return [];

    // Ranked fuzzy search: exact/prefix code first, then FTS over code+name,
    // then trigram name similarity (typo-tolerant). Parameterized - safe
    // (prepared statement). Same output shape as before ({ id, code, name,
    // creditUnits }) so the roadmap planner UI contract is preserved.
    const rows = await ctx.db.$queryRaw<SearchRow[]>`
      SELECT c.id, c.code, c.name, c.credit_units AS "creditUnits"
      FROM courses c
      WHERE (
        c.code ILIKE ('%' || ${q} || '%')
        OR to_tsvector('simple', c.code || ' ' || c.name)
           @@ plainto_tsquery('simple', ${q})
        OR similarity(c.name, ${q}) > 0.3
      )
      ORDER BY
        (c.code ILIKE (${q} || '%'))::int DESC,
        similarity(c.name, ${q}) DESC,
        c.code
      LIMIT 20;
    `;

    return rows;
  });
