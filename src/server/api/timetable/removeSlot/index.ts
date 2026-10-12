import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { findOwnedTimetableOr404 } from "@/server/api/ownership";

export const removeSlot = protectedProcedure
  .input(
    z.object({
      timetableId: z.string(),
      classId: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    await findOwnedTimetableOr404(
      ctx.db,
      input.timetableId,
      ctx.session.user.id,
    );

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
