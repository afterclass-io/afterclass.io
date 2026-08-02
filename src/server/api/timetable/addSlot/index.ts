import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

export const addSlot = protectedProcedure
  .input(
    z.object({
      timetableId: z.string(),
      classId: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const timetable = await ctx.db.userTimetable.findUnique({
      where: { id: input.timetableId, userId: ctx.session.user.id },
    });

    if (!timetable) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return ctx.db.userTimetableSlot.create({
      data: {
        timetableId: input.timetableId,
        classId: input.classId,
      },
    });
  });
