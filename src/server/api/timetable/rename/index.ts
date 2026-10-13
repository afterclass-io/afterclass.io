import { z } from "zod";

import { findOwnedTimetableOr404 } from "@/server/api/ownership";
import { protectedProcedure } from "@/server/api/trpc";

export const rename = protectedProcedure
  .input(
    z.object({
      timetableId: z.string(),
      name: z.string().min(1).max(100),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    await findOwnedTimetableOr404(
      ctx.db,
      input.timetableId,
      ctx.session.user.id,
    );

    return ctx.db.userTimetable.update({
      where: { id: input.timetableId },
      data: { name: input.name },
    });
  });
