import { ReviewType } from "@prisma/client";
import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";

export const getAllByType = publicProcedure
  .input(z.object({ typeOf: z.nativeEnum(ReviewType) }))
  .query(
    async ({ input, ctx }) =>
      await ctx.db.labels.findMany({
        where: {
          typeOf: input.typeOf,
        },
      }),
  );
