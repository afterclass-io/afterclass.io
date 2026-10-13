import { z } from "zod";

import { findOwnedTimetableOr404 } from "@/server/api/ownership";
import { protectedProcedure } from "@/server/api/trpc";

export const remove = protectedProcedure
  .input(z.object({ timetableId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    await findOwnedTimetableOr404(
      ctx.db,
      input.timetableId,
      ctx.session.user.id,
    );

    await ctx.db.userTimetable.delete({
      where: { id: input.timetableId },
    });

    return { success: true };
  });
