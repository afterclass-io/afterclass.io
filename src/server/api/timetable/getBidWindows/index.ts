import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";

export const getBidWindows = protectedProcedure
  .input(z.object({ acadTermId: z.string() }))
  .query(async ({ ctx, input }) => {
    return ctx.db.bidWindow.findMany({
      where: { acadTermId: input.acadTermId },
      orderBy: [{ round: "asc" }, { window: "asc" }],
      select: {
        id: true,
        round: true,
        window: true,
        opensAt: true,
        closesAt: true,
        resultsAt: true,
      },
    });
  });
