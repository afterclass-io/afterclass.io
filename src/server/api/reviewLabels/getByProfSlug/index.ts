import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";

export const getByProfSlug = publicProcedure
  .input(z.object({ slug: z.string() }))
  .query(
    async ({ input, ctx }) =>
      await ctx.db.reviewLabels.findMany({
        include: {
          review: true,
          label: true,
        },
        where: {
          review: {
            reviewedProfessor: {
              slug: input.slug,
            },
          },
        },
      }),
  );
