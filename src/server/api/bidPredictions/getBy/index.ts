import { z } from "zod";
import { publicProcedure } from "@/server/api/trpc";

export const getBy = publicProcedure
  .input(
    z.object({
      classId: z.string().optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    // Find the most recent prediction for this class in a single query.
    // Walking backwards through bid windows by resultsAt (desc) ensures we
    // get the prediction for the latest window that actually has one.
    const prediction = await ctx.db.bidPrediction.findFirst({
      where: { classId: input.classId },
      include: { bidWindow: true },
      orderBy: { bidWindow: { resultsAt: "desc" } },
    });

    return prediction;
  });
