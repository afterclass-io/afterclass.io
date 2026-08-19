import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";

export const listMine = protectedProcedure
  .input(z.object({ acadTermId: z.string() }))
  .query(async ({ ctx, input }) => {
    return ctx.db.userTimetable.findMany({
      where: {
        userId: ctx.session.user.id,
        acadTermId: input.acadTermId,
      },
      include: {
        _count: {
          select: { slots: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  });
