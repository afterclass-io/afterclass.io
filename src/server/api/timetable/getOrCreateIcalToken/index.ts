import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { requireOwnedTimetable } from "@/server/api/ownership";
import { assertCalendarLinkAllowed } from "@/server/api/timetable/ical-expiry";
import { mintAndStoreIcalToken } from "@/server/api/timetable/mint-ical-token";

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

    const icalToken = await mintAndStoreIcalToken(
      ctx.db,
      input.timetableId,
      ctx.session.user.id,
    );
    return { icalToken };
  });
