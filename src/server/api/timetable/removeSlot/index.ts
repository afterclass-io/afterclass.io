import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

export const removeSlot = protectedProcedure
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

    // Idempotent: a missing slot (e.g. double-clicked remove racing the
    // first delete) is already in the desired end state — treat as success.
    await ctx.db.userTimetableSlot.deleteMany({
      where: {
        timetableId: input.timetableId,
        classId: input.classId,
      },
    });

    return { success: true };
  });
