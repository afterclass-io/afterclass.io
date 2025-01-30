import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";

export const getBySlug = publicProcedure
  .input(z.object({ slug: z.string() }))
  .query(
    async ({ input, ctx }) =>
      await ctx.db.professors.findUnique({
        include: {
          belongToUniversity: true,
        },
        where: {
          slug: input.slug,
        },
      }),
  );
