import { ReviewLabelType } from "@prisma/client";
import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";

export const getAllByType = publicProcedure
  .input(z.object({ typeOf: z.nativeEnum(ReviewLabelType) }))
  .query(
    async ({ input, ctx }) =>
      await ctx.db.reviewLabels.findMany({
        include: {
          review: true,
          label: true,
        },
        where: {
          label: {
            typeOf: input.typeOf,
          },
        },
      }),
  );
