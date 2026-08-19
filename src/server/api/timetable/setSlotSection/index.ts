import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";
import { assertClassInTerm } from "@/server/api/classes/assertClassInTerm";

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
      select: { id: true, acadTermId: true },
    });

    if (!timetable) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    // Shared helper from Task 1 — class must belong to the timetable's term.
    await assertClassInTerm(ctx.db, input.classId, timetable.acadTermId);

    await ctx.db.$transaction(async (tx) => {
      // deleteMany is idempotent — no findFirst→delete race (no P2025).
      await tx.userTimetableSlot.deleteMany({
        where: {
          timetableId: input.timetableId,
          class: { courseId: input.courseId },
        },
      });
      await tx.userTimetableSlot.create({
        data: { timetableId: input.timetableId, classId: input.classId },
      });
    });

    return { success: true };
  });
