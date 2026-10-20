import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { publicProcedure } from "@/server/api/trpc";
import { censorProfanity } from "@/server/profanity";
import { toArrangedClass } from "@/modules/timetable/functions/arranged-class";
import { assertSharedLinkWithinLimit } from "@/server/api/sharing/throttle-shared-link";

export const getSharedTimetable = publicProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ ctx, input }) => {
    await assertSharedLinkWithinLimit(ctx);
    // PRIVATE rows are excluded in the lookup itself (mirrors getFeedData):
    // a PRIVATE row with a lingering token is invisible, not just refused.
    const timetable = await ctx.db.userTimetable.findUnique({
      where: { shareToken: input.token, visibility: { not: "PRIVATE" } },
      include: {
        user: {
          select: { username: true },
        },
        slots: {
          include: {
            class: {
              include: {
                course: true,
                professor: true,
                classTimings: true,
                classExamTimings: true,
              },
            },
          },
        },
      },
    });

    if (!timetable) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    // Contains class data and a private timetable: login only. Checked after
    // the lookup so unknown tokens stay NOT_FOUND.
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const slots = timetable.slots.map((slot) => toArrangedClass(slot));

    return {
      timetable: {
        name: censorProfanity(timetable.name),
        ownerUsername: censorProfanity(timetable.user.username),
      },
      slots,
    };
  });
