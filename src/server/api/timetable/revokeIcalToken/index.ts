import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { requireOwnedTimetable } from "@/server/api/ownership";

/**
 * Revoke the timetable's iCal feed token. Existing subscription links stop
 * working (the feed route returns 404) until a new token is generated via
 * `getOrCreateIcalToken`.
 */
export const revokeIcalToken = protectedProcedure
  .input(z.object({ timetableId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // Ownership check — only the owner may revoke.
    await requireOwnedTimetable(ctx.db, input.timetableId, ctx.session.user.id, {
      userId: true,
    });

    await ctx.db.userTimetable.update({
      where: { id: input.timetableId },
      data: { icalToken: null },
    });

    return { icalToken: null };
  });
