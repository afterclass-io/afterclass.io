import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

export const rename = protectedProcedure
  .input(
    z.object({
      timetableId: z.string(),
      name: z.string().min(1).max(100),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.userTimetable.findUnique({
      where: { id: input.timetableId, userId: ctx.session.user.id },
    });

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return ctx.db.userTimetable.update({
      where: { id: input.timetableId },
      data: { name: input.name },
    });
  });
