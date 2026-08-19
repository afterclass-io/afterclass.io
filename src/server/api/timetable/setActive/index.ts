import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";
import { createSlotsSkipDuplicates } from "@/server/api/timetable/addSlot/helpers";

export const setActive = protectedProcedure
  .input(z.object({ timetableId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const timetable = await ctx.db.userTimetable.findUnique({
      where: { id: input.timetableId, userId: ctx.session.user.id },
    });

    if (!timetable) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    await ctx.db.$transaction(async (tx) => {
      await tx.userTimetable.updateMany({
        where: {
          userId: ctx.session.user.id,
          acadTermId: timetable.acadTermId,
        },
        data: { isActive: false },
      });
      await tx.userTimetable.update({
        where: { id: input.timetableId },
        data: { isActive: true },
      });
      const secured = await tx.userBid.findMany({
        where: {
          userId: ctx.session.user.id,
          status: "SECURED",
          class: { acadTermId: timetable.acadTermId },
        },
        select: { classId: true },
      });
      await createSlotsSkipDuplicates(
        tx,
        input.timetableId,
        secured.map((b) => b.classId),
      );
    });

    return { success: true };
  });
