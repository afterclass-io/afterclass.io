import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";

export const getByClassIds = protectedProcedure
  .input(z.object({ classIds: z.array(z.string()).min(1).max(100) }))
  .query(async ({ ctx, input }) => {
    return ctx.db.userBid.findMany({
      where: {
        userId: ctx.session.user.id,
        classId: { in: input.classIds },
      },
      include: {
        bidWindow: {
          select: {
            round: true,
            window: true,
            closesAt: true,
            resultsAt: true,
          },
        },
      },
    });
  });
