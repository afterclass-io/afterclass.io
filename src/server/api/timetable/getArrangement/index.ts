import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";
import { toArrangedClass } from "@/modules/timetable/functions/arranged-class";

export const getArrangement = protectedProcedure
  .input(z.object({ timetableId: z.string() }))
  .query(async ({ ctx, input }) => {
    const userTimetable = await ctx.db.userTimetable.findUnique({
      where: { id: input.timetableId, userId: ctx.session.user.id },
      select: {
        id: true,
        slots: {
          select: {
            class: {
              select: {
                id: true,
                section: true,
                course: {
                  select: { id: true, code: true, name: true, creditUnits: true },
                },
                professor: {
                  select: { id: true, name: true },
                },
                classTimings: {
                  select: {
                    id: true,
                    dayOfWeek: true,
                    startTime: true,
                    endTime: true,
                    venue: true,
                  },
                },
                classExamTimings: {
                  select: {
                    id: true,
                    date: true,
                    dayOfWeek: true,
                    startTime: true,
                    endTime: true,
                    venue: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!userTimetable) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const slots = userTimetable.slots.map((slot) => toArrangedClass(slot));

    // Co-locate the user's bids for these classes so the grid can paint
    // final bid-status colours atomically with the slots (no second-query
    // waterfall that flashes courseColor → status colour on first load).
    const classIds = slots.map((s) => s.classId);
    const bids =
      classIds.length > 0
        ? await ctx.db.userBid.findMany({
            where: {
              userId: ctx.session.user.id,
              classId: { in: classIds },
            },
            // Only what the grid's bid chips read (page.tsx bidsMap).
            select: {
              classId: true,
              bidAmount: true,
              status: true,
              bidWindow: {
                select: {
                  round: true,
                },
              },
            },
          })
        : [];

    return {
      slots,
      bids,
    };
  });
