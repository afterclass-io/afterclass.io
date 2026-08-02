import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

export const setSlotSection = protectedProcedure
  .input(
    z.object({
      timetableId: z.string(),
      courseId: z.string(),
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

    await ctx.db.$transaction(async (tx) => {
      // Find and delete any existing slot for this timetable+course
      const existingSlot = await tx.userTimetableSlot.findFirst({
        where: {
          timetableId: input.timetableId,
          class: { courseId: input.courseId },
        },
      });

      if (existingSlot) {
        await tx.userTimetableSlot.delete({
          where: { id: existingSlot.id },
        });
      }

      // Insert new slot
      await tx.userTimetableSlot.create({
        data: {
          timetableId: input.timetableId,
          classId: input.classId,
        },
      });
    });

    return { success: true };
  });
