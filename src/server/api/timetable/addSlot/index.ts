import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";
import { assertClassInTerm } from "@/server/api/classes/assertClassInTerm";
import { createSlotIfMissing } from "./helpers";

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
      select: { id: true, acadTermId: true },
    });

    if (!timetable) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    // The class must belong to the timetable's academic term (shared helper).
    await assertClassInTerm(ctx.db, input.classId, timetable.acadTermId);

    const created = await createSlotIfMissing(
      ctx.db,
      input.timetableId,
      input.classId,
    );
    return { created };
  });
