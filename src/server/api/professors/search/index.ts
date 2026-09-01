import { z } from "zod";

import { normalizeSearchQuery } from "@/common/tools/query-normalize";
import { publicProcedure } from "@/server/api/trpc";

type SearchRow = {
  id: string;
  slug: string;
  name: string;
  count: bigint | number;
};

export const search = publicProcedure
  .input(
    z.object({
      query: z.string().min(1),
      limit: z.number().int().min(1).max(50).default(10),
    }),
  )
  .query(async ({ ctx, input }) => {
    const q = normalizeSearchQuery(input.query);
    // No professor name/alias/slug is 1 char; reject before SQL (mirrors the
    // search-courses min-length guard).
    if (q.length < 2) return { rows: [], count: 0 };

    // Fuzzy search over professor name / URL slug / boss aliases. ILIKE covers
    // substring + prefix, word_similarity gives best-word typo tolerance on
    // name, and the unnest(boss_aliases) branch searches each stored alias.
    // COUNT(*) OVER () runs before LIMIT, so `count` is the TRUE total number
    // of matches, not the page size. Parameterized - safe (prepared statement).
    const rows = await ctx.db.$queryRaw<SearchRow[]>`
      SELECT p.id, p.slug, p.name, COUNT(*) OVER () AS count
      FROM professors p
      WHERE
        p.name ILIKE ('%' || ${q} || '%')
        OR p.slug ILIKE ('%' || ${q} || '%')
        OR word_similarity(p.name, ${q}) > 0.3
        OR EXISTS (
          SELECT 1 FROM unnest(p.boss_aliases) AS alias
          WHERE alias ILIKE ('%' || ${q} || '%')
        )
      ORDER BY
        (p.name ILIKE (${q} || '%'))::int DESC,
        word_similarity(p.name, ${q}) DESC,
        p.name
      LIMIT ${input.limit};
    `;

    return {
      rows: rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name })),
      count: Number(rows[0]?.count ?? 0),
    };
  });
