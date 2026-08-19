import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";
import { mintToken, requireOwnedTimetable } from "@/server/api/ownership";

/**
 * Return the timetable's iCal feed token, generating one on first use.
 * The token powers the public `GET /api/ical/[token]` calendar feed.
 *
 * Refuses to mint a token while the timetable is PRIVATE — the user
 * must change visibility to UNLISTED or PUBLIC first.
 */
export const getOrCreateIcalToken = protectedProcedure
  .input(z.object({ timetableId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const timetable = await requireOwnedTimetable(
      ctx.db,
      input.timetableId,
      ctx.session.user.id,
      { userId: true, icalToken: true, visibility: true },
    );

    if (timetable.visibility === "PRIVATE") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Set your timetable to link-sharing before creating a calendar link",
      });
    }

    if (timetable.icalToken) {
      return { icalToken: timetable.icalToken };
    }

    const icalToken = mintToken();
    await ctx.db.userTimetable.update({
      where: { id: input.timetableId },
      data: { icalToken },
    });

    return { icalToken };
  });
