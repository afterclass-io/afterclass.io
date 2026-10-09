import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { mintToken, requireOwnedTimetable } from "@/server/api/ownership";
import { assertCalendarLinkAllowed } from "@/server/api/timetable/ical-expiry";

/**
 * Return the timetable's iCal feed token, generating one on first use.
 * The token powers the public `GET /api/ical/[token]` calendar feed.
 *
 * Refuses to mint a token while the timetable is PRIVATE or when the
 * academic term has ended.
 */
export const getOrCreateIcalToken = protectedProcedure
  .input(z.object({ timetableId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const timetable = await requireOwnedTimetable(
      ctx.db,
      input.timetableId,
      ctx.session.user.id,
      {
        userId: true,
        icalToken: true,
        visibility: true,
        acadTerm: { select: { endDt: true } },
      },
    );

    assertCalendarLinkAllowed(timetable);

    if (timetable.icalToken) {
      return { icalToken: timetable.icalToken };
    }

    const icalToken = mintToken();
    // TOCTOU hardening: requireOwnedTimetable checked ownership above; the
    // token write is also scoped to the caller's row.
    await ctx.db.userTimetable.update({
      where: { id: input.timetableId, userId: ctx.session.user.id },
      data: { icalToken },
    });

    return { icalToken };
  });
