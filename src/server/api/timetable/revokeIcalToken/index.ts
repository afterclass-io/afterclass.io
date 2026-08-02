import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

/**
 * Revoke the timetable's iCal feed token. Existing subscription links stop
 * working (the feed route returns 404) until a new token is generated via
 * `getOrCreateIcalToken`.
 */
export const revokeIcalToken = protectedProcedure
  .input(z.object({ timetableId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const timetable = await ctx.db.userTimetable.findUnique({
      where: { id: input.timetableId },
      select: { userId: true },
    });

    if (!timetable || timetable.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    await ctx.db.userTimetable.update({
      where: { id: input.timetableId },
      data: { icalToken: null },
    });

    return { icalToken: null };
  });
