import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { findOwnedTimetableOr404 } from "@/server/api/ownership";
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
    const timetable = await findOwnedTimetableOr404(
      ctx.db,
      input.timetableId,
      ctx.session.user.id,
    );

    // Class must belong to the timetable's term.
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
