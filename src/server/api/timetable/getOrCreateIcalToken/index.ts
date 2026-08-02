import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

import { protectedProcedure } from "@/server/api/trpc";

/**
 * Return the timetable's iCal feed token, generating one on first use.
 * The token powers the public `GET /api/ical/[token]` calendar feed.
 */
export const getOrCreateIcalToken = protectedProcedure
  .input(z.object({ timetableId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const timetable = await ctx.db.userTimetable.findUnique({
      where: { id: input.timetableId },
      select: { userId: true, icalToken: true },
    });

    if (!timetable || timetable.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    if (timetable.icalToken) {
      return { icalToken: timetable.icalToken };
    }

    const icalToken = nanoid(21);
    await ctx.db.userTimetable.update({
      where: { id: input.timetableId },
      data: { icalToken },
    });

    return { icalToken };
  });
