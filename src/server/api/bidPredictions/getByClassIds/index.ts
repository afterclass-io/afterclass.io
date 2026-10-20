import { z } from "zod";
import { biddingProcedure } from "@/server/api/trpc";

export const getByClassIds = biddingProcedure
  .input(
    z.object({
      classIds: z.array(z.string().min(1)).min(1).max(100),
    }),
  )
  .query(async ({ ctx, input }) => {
    return ctx.db.bidPrediction.findMany({
      where: { classId: { in: input.classIds } },
      include: { bidWindow: true },
      orderBy: [{ classId: "asc" }, { bidWindow: { resultsAt: "desc" } }],
      distinct: ["classId"],
    });
  });
