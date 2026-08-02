import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

import { protectedProcedure } from "@/server/api/trpc";

export const setVisibility = protectedProcedure
  .input(
    z.object({
      entity: z.enum(["timetable"]),
      id: z.string(),
      visibility: z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { id, visibility } = input;

    const timetable = await ctx.db.userTimetable.findUnique({
      where: { id },
    });

    if (!timetable || timetable.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    let shareToken: string | null = timetable.shareToken;

    if (visibility === "UNLISTED" || visibility === "PUBLIC") {
      shareToken ??= nanoid(21);
    } else {
      // PRIVATE — clear the token
      shareToken = null;
    }

    await ctx.db.userTimetable.update({
      where: { id },
      data: { visibility, shareToken },
    });

    return { visibility, shareToken };
  });
