import { z } from "zod";
import { publicProcedure } from "@/server/api/trpc";

export const getBy = publicProcedure
  .input(
    z.object({
      classId: z.string().optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const latestBidWindow = await ctx.db.bidWindow.findFirst({
      orderBy: {
        id: "desc",
      },
    });
    return await ctx.db.bidPrediction.findFirst({
      where: {
        classId: input.classId,
        bidWindowId: latestBidWindow?.id,
      },
      include: {
        bidWindow: true,
      },
    });
  });
