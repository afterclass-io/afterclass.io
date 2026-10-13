import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { findOwnedTimetableOr404 } from "@/server/api/ownership";
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
    const timetable = await findOwnedTimetableOr404(
      ctx.db,
      input.timetableId,
      ctx.session.user.id,
    );

    // The class must belong to the timetable's academic term (shared helper).
    await assertClassInTerm(ctx.db, input.classId, timetable.acadTermId);

    const created = await createSlotIfMissing(
      ctx.db,
      input.timetableId,
      input.classId,
    );
    return { created };
  });
