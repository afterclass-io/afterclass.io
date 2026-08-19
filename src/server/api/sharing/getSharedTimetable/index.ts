import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { publicProcedure } from "@/server/api/trpc";
import { toArrangedClass } from "@/modules/timetable/functions/arranged-class";

export const getSharedTimetable = publicProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ ctx, input }) => {
    const timetable = await ctx.db.userTimetable.findUnique({
      where: { shareToken: input.token },
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

    const slots = timetable.slots.map((slot) => toArrangedClass(slot));

    return {
      timetable: {
        name: timetable.name,
        ownerUsername: timetable.user.username,
      },
      slots,
    };
  });
