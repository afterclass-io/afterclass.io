import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";

export const countByProfSlug = publicProcedure
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
