import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { requireOwnedTimetable } from "@/server/api/ownership";
import { assertCalendarLinkAllowed } from "@/server/api/timetable/ical-expiry";
import { mintAndStoreIcalToken } from "@/server/api/timetable/mint-ical-token";

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

    const icalToken = await mintAndStoreIcalToken(
      ctx.db,
      input.timetableId,
      ctx.session.user.id,
    );
    return { icalToken };
  });
