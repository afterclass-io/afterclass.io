import { z } from "zod";
import { publicProcedure } from "@/server/api/trpc";

export const getBy = publicProcedure
  .input(
    z.object({
      classId: z.string().optional(),
    }),
  )
  .query(({ ctx, input }) =>
    ctx.db.bidPrediction.findFirst({
      where: {
        classId: input.classId,
      },
    }),
  );
