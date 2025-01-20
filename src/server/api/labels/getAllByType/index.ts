import { ReviewLabelType } from "@prisma/client";
import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";

export const getAllByType = publicProcedure
  .input(z.object({ typeOf: z.nativeEnum(ReviewLabelType) }))
  .query(
    async ({ input, ctx }) =>
      await ctx.db.labels.findMany({
        where: {
          typeOf: input.typeOf,
        },
      }),
  );
