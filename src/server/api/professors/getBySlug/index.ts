import { z } from "zod";

import { dataProcedure } from "@/server/api/trpc";

export const getBySlug = dataProcedure("professors")
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
