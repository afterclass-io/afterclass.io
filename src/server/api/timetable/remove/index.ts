import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

export const remove = protectedProcedure
  .input(z.object({ timetableId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.userTimetable.findUnique({
      where: { id: input.timetableId, userId: ctx.session.user.id },
    });

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    await ctx.db.userTimetable.delete({
      where: { id: input.timetableId },
    });

    return { success: true };
  });
