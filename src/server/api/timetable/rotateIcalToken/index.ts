import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { mintToken, requireOwnedTimetable } from "@/server/api/ownership";
import { assertCalendarLinkAllowed } from "@/server/api/timetable/ical-expiry";

/**
 * Rotate the timetable's iCal feed token.
 * Generates a new token and overwrites the existing token.
 * Existing subscription links stop working immediately.
 *
 * Refuses to rotate while the timetable is PRIVATE or when the
 * academic term has ended.
 */
export const rotateIcalToken = protectedProcedure
  .input(z.object({ timetableId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const timetable = await requireOwnedTimetable(
      ctx.db,
      input.timetableId,
      ctx.session.user.id,
      {
        userId: true,
        visibility: true,
        acadTerm: { select: { endDt: true } },
      },
    );

    assertCalendarLinkAllowed(timetable);

    const icalToken = mintToken();
    // TOCTOU hardening: requireOwnedTimetable checked ownership above; the
    // token write is also scoped to the caller's row.
    await ctx.db.userTimetable.update({
      where: { id: input.timetableId, userId: ctx.session.user.id },
      data: { icalToken },
    });

    return { icalToken };
  });
