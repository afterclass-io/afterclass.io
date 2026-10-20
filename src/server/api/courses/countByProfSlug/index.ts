import { z } from "zod";

import { dataProcedure } from "@/server/api/trpc";

export const countByProfSlug = dataProcedure("courses", "professors")
  .input(
    z.object({
      slug: z.string(),
    }),
  )
  .query(
    async ({ ctx, input }) =>
      await ctx.db.courses.count({
        where: {
          classes: {
            some: {
              professor: {
                slug: input.slug,
              },
            },
          },
        },
      }),
  );
